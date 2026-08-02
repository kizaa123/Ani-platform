import { isValidPhone, PHONE_VALIDATION_MESSAGE } from "./phone";
import { ROLES } from "./types";

/** Fields that can show inline registration errors */
export type RegisterField =
  | "firstName"
  | "lastName"
  | "email"
  | "phone"
  | "password"
  | "country"
  | "roleId"
  | "region"
  | "city"
  | "handlerId"
  | "commodities";

export type FieldErrors = Partial<Record<RegisterField, string>>;

export interface RegisterFormSlice {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  country: string;
  region: string;
  city: string;
  roleId: number;
  handlerId: string;
}

export interface RegisterValidationContext {
  form: RegisterFormSlice;
  selectedCommodities: number[];
  customProducts: string[];
  isFarmerRole: boolean;
  needsHandler: boolean;
  availableHandlersCount: number;
  handlerLabel: string;
}

function isValidEmail(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
}

/** Step 1 - Account */
export function validateStep1(form: RegisterFormSlice): FieldErrors {
  const errors: FieldErrors = {};

  if (!form.firstName.trim()) {
    errors.firstName = "Enter your first name";
  } else if (form.firstName.trim().length < 2) {
    errors.firstName = "First name must be at least 2 characters";
  }

  if (!form.lastName.trim()) {
    errors.lastName = "Enter your last name";
  } else if (form.lastName.trim().length < 2) {
    errors.lastName = "Last name must be at least 2 characters";
  }

  if (!form.email.trim()) {
    errors.email = "Enter your email address";
  } else if (!isValidEmail(form.email)) {
    errors.email = "Enter a valid email address";
  }

  if (!form.country.trim()) {
    errors.country = "Select your country";
  } else if (form.country.trim().length < 2) {
    errors.country = "Select a valid country";
  }

  if (!form.phone.trim()) {
    errors.phone = "Enter your phone number";
  } else if (!isValidPhone(form.phone)) {
    errors.phone = PHONE_VALIDATION_MESSAGE;
  }

  if (!form.password) {
    errors.password = "Enter a password";
  } else if (form.password.length < 8) {
    errors.password = "Password must be at least 8 characters";
  }

  return errors;
}

/** Step 2 - Details */
export function validateStep2(ctx: RegisterValidationContext): FieldErrors {
  const { form, needsHandler, availableHandlersCount, handlerLabel } = ctx;
  const errors: FieldErrors = {};

  if (!form.region.trim()) {
    errors.region = "Enter your region or state";
  } else if (form.region.trim().length < 2) {
    errors.region = "Region must be at least 2 characters";
  }

  if (!form.city.trim()) {
    errors.city = "Enter your city";
  } else if (form.city.trim().length < 2) {
    errors.city = "City must be at least 2 characters";
  }

  if (needsHandler) {
    if (availableHandlersCount === 0) {
      errors.handlerId = `No liaison officers available yet - one must register first`;
    } else if (!form.handlerId.trim()) {
      errors.handlerId = handlerLabel;
    }
  }

  return errors;
}

/** Step 3 - Commodities (farmers only) */
export function validateStep3(ctx: RegisterValidationContext): FieldErrors {
  const errors: FieldErrors = {};

  if (ctx.selectedCommodities.length === 0 && ctx.customProducts.length === 0) {
    errors.commodities = "Select at least one commodity or add a custom product";
  }

  if (ctx.needsHandler && !ctx.form.handlerId.trim()) {
    errors.handlerId = ctx.handlerLabel;
  }

  return errors;
}

export function blockingMessages(errors: FieldErrors): string[] {
  return Object.values(errors);
}

export function canProceedStep1(form: RegisterFormSlice): boolean {
  return blockingMessages(validateStep1(form)).length === 0;
}

export function canProceedStep2(ctx: RegisterValidationContext): boolean {
  return blockingMessages(validateStep2(ctx)).length === 0;
}

export function canProceedStep3(ctx: RegisterValidationContext): boolean {
  return blockingMessages(validateStep3(ctx)).length === 0;
}

/** Which steps currently have validation errors */
export function stepsWithErrors(
  ctx: RegisterValidationContext,
  totalSteps: number
): number[] {
  const steps: number[] = [];
  if (blockingMessages(validateStep1(ctx.form)).length > 0) steps.push(1);
  if (totalSteps >= 2 && blockingMessages(validateStep2(ctx)).length > 0) steps.push(2);
  if (totalSteps >= 3 && blockingMessages(validateStep3(ctx)).length > 0) steps.push(3);
  return steps;
}

const BACKEND_FIELD_ALIASES: Record<string, RegisterField> = {
  firstname: "firstName",
  lastname: "lastName",
  email: "email",
  phone: "phone",
  password: "password",
  country: "country",
  region: "region",
  city: "city",
  roleid: "roleId",
  handlerid: "handlerId",
  commodityids: "commodities",
  customproducts: "commodities",
};

function normalizeFieldKey(key: string): RegisterField | undefined {
  return BACKEND_FIELD_ALIASES[key.toLowerCase().replace(/[^a-z]/g, "")];
}

interface ApiValidationIssue {
  path: (string | number)[];
  message: string;
}

/** Map backend registration errors to form fields and a user-facing message */
export function parseRegistrationError(err: unknown): {
  message: string;
  fieldErrors: FieldErrors;
  targetStep?: number;
} {
  const fieldErrors: FieldErrors = {};
  let message = err instanceof Error ? err.message : "Registration failed";

  const details = (err as Error & { details?: ApiValidationIssue[] })?.details;
  if (details?.length) {
    for (const issue of details) {
      const pathKey = issue.path[0]?.toString() ?? "";
      const field = normalizeFieldKey(pathKey);
      if (field) {
        fieldErrors[field] = issue.message;
      }
    }
    message = details.map((d) => (d.path.length ? `${d.path.join(".")}: ${d.message}` : d.message)).join("; ");
  } else {
    mapKnownBackendMessage(message, fieldErrors);
  }

  let targetStep: number | undefined;
  if (fieldErrors.firstName || fieldErrors.lastName || fieldErrors.email || fieldErrors.phone || fieldErrors.password || fieldErrors.country || fieldErrors.roleId) {
    targetStep = 1;
  } else if (fieldErrors.region || fieldErrors.city || fieldErrors.handlerId) {
    targetStep = 2;
  } else if (fieldErrors.commodities) {
    targetStep = 3;
  }

  if (/email already registered/i.test(message)) {
    fieldErrors.email = "This email is already registered - try signing in instead";
    targetStep = 1;
  }

  return { message, fieldErrors, targetStep };
}

function mapKnownBackendMessage(message: string, fieldErrors: FieldErrors): void {
  const pathMatch = /^([a-zA-Z]+):\s*(.+)$/.exec(message);
  if (pathMatch) {
    const field = normalizeFieldKey(pathMatch[1]);
    if (field) {
      fieldErrors[field] = pathMatch[2];
      return;
    }
  }

  if (/phone must be exactly 10 digits/i.test(message)) {
    fieldErrors.phone = PHONE_VALIDATION_MESSAGE;
  } else if (/select a handler/i.test(message)) {
    fieldErrors.handlerId = "Please select a liaison officer";
  } else if (/select at least one.*commodit/i.test(message)) {
    fieldErrors.commodities = message;
  } else if (/invalid role/i.test(message)) {
    fieldErrors.roleId = "Select a valid role";
  } else if (/email/i.test(message) && /invalid|registered|exist/i.test(message)) {
    fieldErrors.email = message;
  } else if (/password/i.test(message)) {
    fieldErrors.password = message.includes("8") ? "Password must be at least 8 characters" : message;
  } else if (/region/i.test(message)) {
    fieldErrors.region = message;
  } else if (/city/i.test(message)) {
    fieldErrors.city = message;
  }
}

export function mergeFieldErrors(...sources: FieldErrors[]): FieldErrors {
  return Object.assign({}, ...sources);
}

/** Human-readable role label for summary messages */
export function roleSummaryLabel(roleId: number): string {
  switch (roleId) {
    case ROLES.CROP_FARMER:
      return "Fellow - Crop";
    case ROLES.LIVESTOCK_FARMER:
      return "Fellow - Livestock";
    case ROLES.ORGANIZATION_FARMER:
      return "Fellow - Organization";
    case ROLES.RESEARCHER:
      return "Researcher";
    case ROLES.BUYER:
      return "Client";
    case ROLES.FARMER_HANDLER:
      return "Fellow Liaison Officer";
    case ROLES.BUYER_HANDLER:
      return "Client Liaison Officer";
    case ROLES.ANI_ACCOUNTANT:
      return "ANI Accountant";
    default:
      return "Select a role";
  }
}
