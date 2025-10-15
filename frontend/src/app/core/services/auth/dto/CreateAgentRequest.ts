
export interface CreateAgentRequest {
    email: string;
    firstName: string;
    lastName: string;
    phone?: string;
    licenseNumber: string;
    biography?: string;
    specializations?: string[];
}
