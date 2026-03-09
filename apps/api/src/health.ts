export type ServiceHealthStatus = "ok" | "degraded" | "error";

export interface DependencyHealthInput {
  name: string;
  status: ServiceHealthStatus;
  required: boolean;
}

export interface ServiceHealthSummary {
  status: ServiceHealthStatus;
  httpStatus: number;
  message: string;
}

export function summarizeServiceHealth(dependencies: DependencyHealthInput[]): ServiceHealthSummary {
  const hasRequiredFailure = dependencies.some((dependency) => dependency.required && dependency.status === "error");
  const hasDegradedDependency = dependencies.some((dependency) => dependency.status !== "ok");

  if (hasRequiredFailure) {
    const failedDependencies = dependencies
      .filter((dependency) => dependency.required && dependency.status === "error")
      .map((dependency) => dependency.name)
      .join(", ");

    return {
      status: "error",
      httpStatus: 503,
      message: `API health check failed because required dependencies are unhealthy: ${failedDependencies}.`,
    };
  }

  if (hasDegradedDependency) {
    const degradedDependencies = dependencies
      .filter((dependency) => dependency.status !== "ok")
      .map((dependency) => dependency.name)
      .join(", ");

    return {
      status: "degraded",
      httpStatus: 200,
      message: `API health check passed with degraded dependencies: ${degradedDependencies}.`,
    };
  }

  return {
    status: "ok",
    httpStatus: 200,
    message: "API health check passed.",
  };
}
