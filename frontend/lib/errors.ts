export class ServerError extends Error {
  constructor(message: string = "Server is not responding") {
    super(message);
    this.name = "ServerError";
  }
}

export async function handleApiError(error: unknown): Promise<never> {
  // Network error or server not responding
  if (error instanceof TypeError && error.message.includes("fetch")) {
    throw new ServerError("Unable to connect to server");
  }

  // Re-throw the error if it's already a ServerError
  if (error instanceof ServerError) {
    throw error;
  }

  // Generic error
  if (error instanceof Error) {
    throw error;
  }

  throw new Error("An unexpected error occurred");
}

export function isServerError(error: unknown): boolean {
  return (
    error instanceof ServerError ||
    (error instanceof TypeError && error.message.includes("fetch"))
  );
}
