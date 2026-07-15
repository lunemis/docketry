const MIN_TOKEN_LENGTH = 24;
const MIN_SESSION_SECRET_LENGTH = 32;

export function isUnsafeNoAuthEnabled(): boolean {
  return (
    process.env.NODE_ENV !== "production" &&
    process.env.DROPBOARD_UNSAFE_NO_AUTH === "true"
  );
}

export function validateServerConfig(): void {
  if (isUnsafeNoAuthEnabled()) {
    console.warn(
      "[dropboard] WARNING: authentication is disabled for local development",
    );
    return;
  }

  const errors: string[] = [];
  const token = process.env.DROPBOARD_TOKEN;
  const pin = process.env.DROPBOARD_PIN;
  const secret = process.env.DROPBOARD_SESSION_SECRET;

  if (!token || token.length < MIN_TOKEN_LENGTH) {
    errors.push(`DROPBOARD_TOKEN must be at least ${MIN_TOKEN_LENGTH} characters`);
  }
  if (!pin || !/^\d{6}$/.test(pin)) {
    errors.push("DROPBOARD_PIN must contain exactly 6 digits");
  }
  if (!secret || secret.length < MIN_SESSION_SECRET_LENGTH) {
    errors.push(
      `DROPBOARD_SESSION_SECRET must be at least ${MIN_SESSION_SECRET_LENGTH} characters`,
    );
  }

  if (errors.length > 0) {
    throw new Error(
      `[dropboard] invalid server configuration:\n- ${errors.join("\n- ")}`,
    );
  }
}

