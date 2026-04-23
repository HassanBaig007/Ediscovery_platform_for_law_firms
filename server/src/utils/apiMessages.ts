export const API_MESSAGES = {
    SUCCESS: {
        RETRIEVED: (entity: string) => `${entity} retrieved successfully`,
        CREATED: (entity: string) => `${entity} created successfully`,
        UPDATED: (entity: string) => `${entity} updated successfully`,
        DELETED: (entity: string) => `${entity} deleted successfully`,
        UPLOADED: (entity: string) => `${entity} uploaded successfully`,
        DOWNLOADED: (entity: string) => `${entity} downloaded successfully`,
        PRODUCED: (entity: string) => `${entity} produced successfully`,
    },
    ERROR: {
        NOT_FOUND: (entity: string) => `${entity} not found`,
        UNAUTHORIZED: 'Unauthorized access',
        FORBIDDEN: 'Permission denied',
        VALIDATION_FAILED: 'Validation failed',
        INTERNAL_SERVER_ERROR: 'Internal server error',
        ALREADY_EXISTS: (entity: string) => `${entity} already exists`,
        INVALID_OPERATION: (operation: string) => `Invalid operation: ${operation}`
    }
};

export const createApiResponse = (success: boolean, message: string, data?: any, meta?: any) => {
    return {
        success,
        message,
        ...(data !== undefined && { data }),
        ...(meta !== undefined && { meta })
    };
};
