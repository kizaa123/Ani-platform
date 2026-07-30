const API = "/api";

interface ApiValidationIssue {
  path: (string | number)[];
  message: string;
}

interface ApiResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  details?: ApiValidationIssue[];
}

class ApiClient {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  constructor() {
    if (typeof window !== "undefined") {
      this.accessToken = localStorage.getItem("accessToken");
      this.refreshToken = localStorage.getItem("refreshToken");
    }
  }

  setTokens(access: string, refresh: string) {
    this.accessToken = access;
    this.refreshToken = refresh;
    localStorage.setItem("accessToken", access);
    localStorage.setItem("refreshToken", refresh);
  }

  clearTokens() {
    this.accessToken = null;
    this.refreshToken = null;
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };
    if (this.accessToken) headers.Authorization = `Bearer ${this.accessToken}`;

    let res = await fetch(`${API}${path}`, { ...options, headers });

    if (res.status === 401 && this.refreshToken) {
      const refreshRes = await fetch(`${API}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: this.refreshToken }),
      });
      if (refreshRes.ok) {
        const json = await refreshRes.json();
        this.accessToken = json.data.accessToken;
        localStorage.setItem("accessToken", json.data.accessToken);
        headers.Authorization = `Bearer ${this.accessToken}`;
        res = await fetch(`${API}${path}`, { ...options, headers });
      } else {
        this.clearTokens();
        if (typeof window !== "undefined") window.location.href = "/login";
        throw new Error("Session expired");
      }
    }

    const contentType = res.headers.get("content-type") || "";
    let json: ApiResult<T>;

    if (contentType.includes("application/json")) {
      json = await res.json();
    } else {
      const text = await res.text();
      throw new Error(
        text.includes("Internal Server Error")
          ? "Backend unavailable. Make sure the API is running on port 3001."
          : text || `Request failed (${res.status})`
      );
    }

    if (!json.success) {
      const detail = json.details?.[0];
      const message =
        json.error ||
        (detail
          ? detail.path.length
            ? `${detail.path.join(".")}: ${detail.message}`
            : detail.message
          : undefined) ||
        "Request failed";
      throw new Error(message);
    }
    return json.data as T;
  }

  private async fetchPdfBlobUrl(path: string): Promise<string> {
    const headers: Record<string, string> = {};
    if (this.accessToken) headers.Authorization = `Bearer ${this.accessToken}`;

    let res = await fetch(`${API}${path}`, { headers });

    if (res.status === 401 && this.refreshToken) {
      const refreshRes = await fetch(`${API}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: this.refreshToken }),
      });
      if (refreshRes.ok) {
        const json = await refreshRes.json();
        this.accessToken = json.data.accessToken;
        localStorage.setItem("accessToken", json.data.accessToken);
        headers.Authorization = `Bearer ${this.accessToken}`;
        res = await fetch(`${API}${path}`, { headers });
      } else {
        this.clearTokens();
        if (typeof window !== "undefined") window.location.href = "/login";
        throw new Error("Session expired");
      }
    }

    if (!res.ok) {
      const contentType = res.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        const json = await res.json();
        throw new Error(json.error || "Could not load PDF");
      }
      throw new Error(`Could not load PDF (${res.status})`);
    }

    const blob = await res.blob();
    const pdfBlob =
      blob.type === "application/pdf" ? blob : new Blob([blob], { type: "application/pdf" });
    return URL.createObjectURL(pdfBlob);
  }

  fetchPdfUrl = (path: string) => this.fetchPdfBlobUrl(path);

  private async openPdfRequest(path: string): Promise<void> {
    const url = await this.fetchPdfBlobUrl(path);
    const tab = window.open(url, "_blank", "noopener,noreferrer");
    if (!tab) {
      URL.revokeObjectURL(url);
      throw new Error("Could not open PDF. Please allow pop-ups for this site.");
    }
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }

  private async uploadRequest<T>(path: string, formData: FormData): Promise<T> {
    const headers: Record<string, string> = {};
    if (this.accessToken) headers.Authorization = `Bearer ${this.accessToken}`;

    const res = await fetch(`${API}${path}`, { method: "POST", headers, body: formData });
    const json: ApiResult<T> = await res.json();
    if (!json.success) throw new Error(json.error || "Upload failed");
    return json.data as T;
  }

  upload = {
    profilePicture: (file: File) => {
      const fd = new FormData();
      fd.append("image", file);
      return this.uploadRequest<{ url: string }>("/upload/profile-picture", fd);
    },
    listingImages: (files: File[]) => {
      const fd = new FormData();
      files.forEach((f) => fd.append("images", f));
      return this.uploadRequest<{ urls: string[] }>("/upload/listing-images", fd);
    },
    publicationFiles: (file?: File, cover?: File) => {
      const fd = new FormData();
      if (file) fd.append("file", file);
      if (cover) fd.append("cover", cover);
      return this.uploadRequest<{ fileUrl?: string; coverImage?: string }>("/upload/publication-files", fd);
    },
  };

  auth = {
    handlers: (type: "farmer" | "buyer") =>
      this.request<import("./types").HandlerProfile[]>(`/auth/handlers/${type}`),
    register: (body: Record<string, unknown>) =>
      this.request<{ user: import("./types").User; accessToken: string; refreshToken: string }>(
        "/auth/register",
        { method: "POST", body: JSON.stringify(body) }
      ),
    login: (email: string, password: string) =>
      this.request<{ user: import("./types").User; accessToken: string; refreshToken: string }>(
        "/auth/login",
        { method: "POST", body: JSON.stringify({ email, password }) }
      ),
    me: () => this.request<import("./types").UserProfile>("/auth/me"),
    updateProfile: (body: Record<string, unknown>) =>
      this.request<import("./types").UserProfile>("/auth/profile", {
        method: "PUT",
        body: JSON.stringify(body),
      }),
    updateHandler: (handlerId: string) =>
      this.request("/auth/handler", {
        method: "PUT",
        body: JSON.stringify({ handlerId }),
      }),
    logout: () =>
      this.request("/auth/logout", {
        method: "POST",
        body: JSON.stringify({ refreshToken: this.refreshToken }),
      }),
  };

  commodities = {
    categories: () => this.request<import("./types").CommodityCategory[]>("/commodities/categories"),
    all: () => this.request<import("./types").Commodity[]>("/commodities"),
  };

  marketplace = {
    browse: (q?: string) =>
      this.request<import("./types").MarketplaceBrowse>(
        `/marketplace/browse${q ? `?q=${encodeURIComponent(q)}` : ""}`
      ),
    list: () => this.request<import("./types").Listing[]>("/marketplace"),
    my: () => this.request<import("./types").Listing[]>("/marketplace/my"),
    create: (body: Record<string, unknown>) =>
      this.request("/marketplace", { method: "POST", body: JSON.stringify(body) }),
    update: (id: string, body: Record<string, unknown>) =>
      this.request(`/marketplace/${id}`, { method: "PUT", body: JSON.stringify(body) }),
    remove: (id: string) =>
      this.request(`/marketplace/${id}`, { method: "DELETE" }),
    purchase: (id: string, body: { quantity: number; paymentMethod: string }) =>
      this.request<{
        orderId: string;
        releaseOtp: string | null;
        totalPaid: number;
        message: string;
      }>(`/marketplace/${id}/purchase`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    media: {
      list: (listingId: string) =>
        this.request<import("./types").ProductMediaItem[]>(`/farm/listings/${listingId}/media`),
      upload: (listingId: string, file: File, duration?: number) => {
        const fd = new FormData();
        fd.append("media", file);
        if (duration != null) fd.append("duration", String(duration));
        return this.uploadRequest<import("./types").ProductMediaItem>(
          `/farm/listings/${listingId}/media`,
          fd
        );
      },
      remove: (listingId: string, mediaId: string) =>
        this.request(`/farm/listings/${listingId}/media/${mediaId}`, { method: "DELETE" }),
      like: (listingId: string, mediaId: string) =>
        this.request<{ liked: boolean; likesCount: number }>(
          `/farm/listings/${listingId}/media/${mediaId}/like`,
          { method: "POST" }
        ),
      share: (listingId: string, mediaId: string) =>
        this.request<{ sharesCount: number }>(
          `/farm/listings/${listingId}/media/${mediaId}/share`,
          { method: "POST" }
        ),
    },
  };

  orders = {
    get: (id: string) =>
      this.request<import("./types").OrderDetail>(`/orders/${id}`),
    statement: (id: string) => this.openPdfRequest(`/orders/${id}/statement`),
    statementUrl: (id: string) => this.fetchPdfBlobUrl(`/orders/${id}/statement`),
    release: (id: string, otp: string) =>
      this.request<import("./types").OrderReleaseResult>(`/orders/${id}/release`, {
        method: "POST",
        body: JSON.stringify({ otp }),
      }),
  };

  payments = {
    packages: () => this.request<import("./types").AccessPackage[]>("/payments/packages"),
    access: () => this.request<{ hasAccess: boolean; access: unknown }>("/payments/access"),
    purchase: (packageId: string, paymentMethod: string) =>
      this.request("/payments/purchase", {
        method: "POST",
        body: JSON.stringify({ packageId, paymentMethod }),
      }),
    purchaseFarmAccess: (farmerId: string, paymentMethod: string) =>
      this.request("/payments/farm-access", {
        method: "POST",
        body: JSON.stringify({ farmerId, paymentMethod }),
      }),
    history: () => this.request("/payments/history"),
  };

  farm = {
    profile: () => this.request("/farm/profile"),
    update: (body: Record<string, unknown>) =>
      this.request("/farm/profile", { method: "PUT", body: JSON.stringify(body) }),
    commodities: () => this.request("/farm/commodities"),
    addCommodity: (body: Record<string, unknown>) =>
      this.request("/farm/commodities", { method: "POST", body: JSON.stringify(body) }),
    removeCommodity: (id: string) =>
      this.request(`/farm/commodities/${id}`, { method: "DELETE" }),
    financialStatement: () => this.request<import("./types").FinancialStatement>("/farm/financial-statement"),
    orders: () => this.request<import("./types").ProductOrderLineItem[]>("/farm/orders"),
    updateOrderTrack: (body: {
      buyerId: string;
      listingId: string;
      trackStage: import("./orderTrack").OrderTrackStage;
    }) =>
      this.request<import("./types").ProductOrderLineItem>("/farm/orders/track", {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    clients: () => this.request<import("./types").FarmClient[]>("/farm/clients"),
    notifyClient: (body: { clientId: string; message?: string }) =>
      this.request<{ success: boolean }>("/farm/notify-client", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    media: {
      list: () => this.request<import("./types").FarmerMediaItem[]>("/farm/media"),
      listByFarmer: (farmerUserId: string) =>
        this.request<import("./types").FarmerMediaItem[]>(`/farm/media/by-farmer/${farmerUserId}`),
      upload: (file: File, duration?: number) => {
        const fd = new FormData();
        fd.append("media", file);
        if (duration != null) fd.append("duration", String(duration));
        return this.uploadRequest<import("./types").FarmerMediaItem>("/farm/media", fd);
      },
      remove: (id: string) => this.request(`/farm/media/${id}`, { method: "DELETE" }),
      like: (id: string) =>
        this.request<{ liked: boolean; likesCount: number }>(`/farm/media/${id}/like`, {
          method: "POST",
        }),
      share: (id: string) =>
        this.request<{ sharesCount: number }>(`/farm/media/${id}/share`, { method: "POST" }),
    },
  };

  buyer = {
    financialStatement: () =>
      this.request<import("./types").BuyerFinancialStatement>("/buyer/financial-statement"),
    orders: () => this.request<import("./types").BuyerOrderLineItem[]>("/buyer/orders"),
  };

  research = {
    browse: (q?: string) =>
      this.request<import("./types").ResearchPublication[]>(
        `/research/browse${q ? `?q=${encodeURIComponent(q)}` : ""}`
      ),
    browsePublishers: (q?: string) =>
      this.request<import("./types").PublisherBrowseCard[]>(
        `/research/publishers${q ? `?q=${encodeURIComponent(q)}` : ""}`
      ),
    getPublisher: (publisherId: string) =>
      this.request<import("./types").PublisherLibrary>(`/research/publisher/${publisherId}`),
    my: () => this.request<import("./types").ResearchPublication[]>("/research/my"),
    get: (id: string) => this.request<import("./types").ResearchPublication>(`/research/${id}`),
    create: (body: Record<string, unknown>) =>
      this.request("/research", { method: "POST", body: JSON.stringify(body) }),
    update: (id: string, body: Record<string, unknown>) =>
      this.request(`/research/${id}`, { method: "PUT", body: JSON.stringify(body) }),
    remove: (id: string) => this.request(`/research/${id}`, { method: "DELETE" }),
    recordView: (id: string) =>
      this.request<{ viewCount: number }>(`/research/${id}/view`, { method: "POST" }),
    purchase: (id: string, paymentMethod: string) =>
      this.request(`/research/${id}/purchase`, {
        method: "POST",
        body: JSON.stringify({ paymentMethod }),
      }),
    financialStatement: () =>
      this.request<import("./types").ResearcherFinancialStatement>("/research/financial-statement"),
    updateProfile: (body: Record<string, unknown>) =>
      this.request("/research/profile", { method: "PUT", body: JSON.stringify(body) }),
    like: (id: string) =>
      this.request<{ liked: boolean; likesCount: number }>(`/research/${id}/like`, {
        method: "POST",
      }),
    share: (id: string) =>
      this.request<{ sharesCount: number }>(`/research/${id}/share`, { method: "POST" }),
    openDocument: (id: string) => this.fetchPdfBlobUrl(`/research/${id}/document`),
    comments: {
      list: (id: string) =>
        this.request<import("./types").ResearchComment[]>(`/research/${id}/comments`),
      add: (id: string, content: string) =>
        this.request<import("./types").ResearchComment>(`/research/${id}/comments`, {
          method: "POST",
          body: JSON.stringify({ content }),
        }),
    },
  };

  connections = {
    list: () => this.request<import("./types").Connection[]>("/connections"),
    create: (farmerId: string) =>
      this.request("/connections", { method: "POST", body: JSON.stringify({ farmerId }) }),
    updateStatus: (id: string, status: string) =>
      this.request(`/connections/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
  };

  agents = {
    assignments: () => this.request<import("./types").AgentAssignment[]>("/agents/assignments"),
    clientFarm: (ownerId: string) =>
      this.request<import("./types").HandlerClientFarm>(`/agents/clients/${ownerId}/farm`),
    clientOrders: (ownerId: string) =>
      this.request<import("./types").ProductOrderLineItem[]>(`/agents/clients/${ownerId}/orders`),
    updateClientOrderTrack: (
      ownerId: string,
      body: {
        buyerId: string;
        listingId: string;
        trackStage: import("./orderTrack").OrderTrackStage;
      }
    ) =>
      this.request<import("./types").ProductOrderLineItem>(
        `/agents/clients/${ownerId}/orders/track`,
        { method: "PATCH", body: JSON.stringify(body) }
      ),
    clientFinancialStatement: (ownerId: string) =>
      this.request<import("./types").FinancialStatement | import("./types").BuyerFinancialStatement>(
        `/agents/clients/${ownerId}/financial-statement`
      ),
    financialStatement: () =>
      this.request<import("./types").HandlerFinancialStatement>("/agents/financial-statement"),
    clientConnections: (ownerId: string) =>
      this.request<import("./types").Connection[]>(`/agents/clients/${ownerId}/connections`),
  };

  messages = {
    send: (receiverId: string, message: string) =>
      this.request("/messages", { method: "POST", body: JSON.stringify({ receiverId, message }) }),
    conversation: (partnerId: string) =>
      this.request<import("./types").Message[]>(`/messages/${partnerId}`),
  };

  notifications = {
    list: () => this.request<import("./types").AppNotification[]>("/notifications"),
    unreadCount: () => this.request<{ count: number }>("/notifications/unread-count"),
    markRead: (id: string) =>
      this.request(`/notifications/${id}/read`, { method: "PATCH" }),
    markAllRead: () =>
      this.request("/notifications/read-all", { method: "PATCH" }),
  };

  admin = {
    stats: () => this.request<import("./types").AdminStats>("/admin/stats"),
    dashboardCharts: () =>
      this.request<import("./types").AdminDashboardCharts>("/admin/dashboard-charts"),
    financialStatement: () =>
      this.request<import("./types").PlatformFinancialStatement>("/admin/financial-statement"),
    pending: () => this.request<import("./types").PendingVerificationUser[]>("/admin/pending"),
    users: (params?: { status?: string; roleId?: number }) => {
      const q = new URLSearchParams();
      if (params?.status) q.set("status", params.status);
      if (params?.roleId) q.set("roleId", String(params.roleId));
      const qs = q.toString();
      return this.request<import("./types").AdminVerificationUser[]>(
        `/admin/users${qs ? `?${qs}` : ""}`
      );
    },
    verify: (id: string, status: string) =>
      this.request(`/admin/users/${id}/verify`, { method: "PATCH", body: JSON.stringify({ status }) }),
    listVerificationTags: (userId: string) =>
      this.request<import("./types").UserVerificationTag[]>(`/admin/users/${userId}/verification-tags`),
    assignVerificationTag: (userId: string, tagType: import("./types").VerificationTagType) =>
      this.request<import("./types").UserVerificationTag>(`/admin/users/${userId}/verification-tags`, {
        method: "POST",
        body: JSON.stringify({ tagType }),
      }),
    removeVerificationTag: (userId: string, tagType: import("./types").VerificationTagType) =>
      this.request<{ removed: boolean }>(`/admin/users/${userId}/verification-tags/${tagType}`, {
        method: "DELETE",
      }),
    auditLogs: () => this.request("/admin/audit-logs"),
    payments: () => this.request("/payments/admin"),
    staff: {
      list: () => this.request<import("./types").StaffMember[]>("/admin/staff"),
      create: (body: {
        firstName: string;
        lastName: string;
        email: string;
        phone: string;
        password: string;
        roleId: number;
      }) =>
        this.request<import("./types").StaffMember>("/admin/staff", {
          method: "POST",
          body: JSON.stringify(body),
        }),
      update: (
        id: string,
        body: Partial<{
          firstName: string;
          lastName: string;
          roleId: number;
          isActive: boolean;
        }>
      ) =>
        this.request<import("./types").StaffMember>(`/admin/staff/${id}`, {
          method: "PATCH",
          body: JSON.stringify(body),
        }),
    },
  };

  accountant = {
    overview: () => this.request<import("./types").AccountantOverview>("/accountant/overview"),
    incomeChart: () =>
      this.request<import("./types").AccountantIncomeChart>("/accountant/income-chart"),
    dashboardCharts: () =>
      this.request<import("./types").AccountantDashboardCharts>("/accountant/dashboard-charts"),
    financialStatement: () =>
      this.request<import("./types").PlatformFinancialStatement>("/accountant/financial-statement"),
    listWithdrawals: () =>
      this.request<import("./types").PlatformWithdrawal[]>("/accountant/withdrawals"),
    createWithdrawal: (body: { amount: number; notes?: string }) =>
      this.request<import("./types").PlatformWithdrawal>("/accountant/withdrawals", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    updateWithdrawal: (id: string, body: { status: string; notes?: string }) =>
      this.request<import("./types").PlatformWithdrawal>(`/accountant/withdrawals/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    getOrderDistribution: (orderId: string) =>
      this.request<import("./types").OrderMoneyDistributionSnapshot>(
        `/accountant/orders/${orderId}/distribution`
      ),
    distributeOrderLine: (
      orderId: string,
      lineId: string,
      body: { paymentMethod: string; transactionId?: string }
    ) =>
      this.request<import("./types").OrderMoneyDistributionSnapshot>(
        `/accountant/orders/${orderId}/distribution/lines/${lineId}/distribute`,
        { method: "POST", body: JSON.stringify(body) }
      ),
    distributeOrderAll: (orderId: string, body: { paymentMethod: string }) =>
      this.request<import("./types").OrderMoneyDistributionSnapshot>(
        `/accountant/orders/${orderId}/distribution/distribute-all`,
        { method: "POST", body: JSON.stringify(body) }
      ),
    distributionMessagePdfUrl: (orderId: string, lineId: string) =>
      this.fetchPdfBlobUrl(
        `/accountant/orders/${orderId}/distribution/lines/${lineId}/message-pdf`
      ),
  };
}

export const api = new ApiClient();
