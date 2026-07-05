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
      this.request(`/marketplace/${id}/purchase`, {
        method: "POST",
        body: JSON.stringify(body),
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
    auditLogs: () => this.request("/admin/audit-logs"),
    payments: () => this.request("/payments/admin"),
  };
}

export const api = new ApiClient();
