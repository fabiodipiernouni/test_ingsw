import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@src/environments/environment';
import { ApiResponse } from '@service-shared/dto/ApiResponse';
import { UserResponse } from '@core-services/auth/dto/UserResponse';
import { PagedResult } from '@service-shared/dto/pagedResult';
import { GetAgentsRequest } from '@core-services/auth/dto/GetAgentsRequest';
import { GetAdminsRequest } from '@core-services/auth/dto/GetAdminsRequest';

@Injectable({
  providedIn: 'root'
})
export class AgencyManagementService {
  private http = inject(HttpClient);
  private readonly API_URL = environment.apiUrlAuth;

  /**
   * Ottiene tutti gli agenti dell'agenzia con paginazione
   */
  getAgents(request: GetAgentsRequest): Observable<ApiResponse<PagedResult<UserResponse>>> {
    let params = new HttpParams();

    // Aggiungi parametri di paginazione
    if (request.pagedRequest) {
      params = params.set('page', request.pagedRequest.page.toString());
      params = params.set('limit', request.pagedRequest.limit.toString());
      params = params.set('sortBy', request.pagedRequest.sortBy);
      params = params.set('sortOrder', request.pagedRequest.sortOrder);
    }

    return this.http.get<ApiResponse<PagedResult<UserResponse>>>(`${this.API_URL}/agents`, { params });
  }

  /**
   * Ottiene tutti gli admin dell'agenzia con paginazione
   */
  getAdmins(request: GetAdminsRequest): Observable<ApiResponse<PagedResult<UserResponse>>> {
    let params = new HttpParams();

    // Aggiungi parametri di paginazione
    if (request.pagedRequest) {
      params = params.set('page', request.pagedRequest.page.toString());
      params = params.set('limit', request.pagedRequest.limit.toString());
      params = params.set('sortBy', request.pagedRequest.sortBy);
      params = params.set('sortOrder', request.pagedRequest.sortOrder);
    }

    return this.http.get<ApiResponse<PagedResult<UserResponse>>>(`${this.API_URL}/admins`, { params });
  }

  /**
   * Elimina un agente
   */
  deleteAgent(agentId: string): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.API_URL}/agents/${agentId}`);
  }

  /**
   * Elimina un admin
   */
  deleteAdmin(adminId: string): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.API_URL}/admins/${adminId}`);
  }
}
