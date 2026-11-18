import type {
	AuthUsrSessionDTO,
	LoginRequestDTO,
	LoginResponseDTO,
} from "@NexaStore/shared";
import { HttpClient } from "@angular/common/http";
import { Injectable, inject, signal } from "@angular/core";
import { type Observable, tap } from "rxjs";

@Injectable({
	providedIn: "root",
})
export class Auth {
	private readonly http = inject(HttpClient);
	// Ajusta la URL base según tu entorno local (ej. puerto 3000 de Express)
	private readonly apiUrl = "http://localhost:3000/api/auth";

	// Signal para acceder fácilmente a los datos del usuario desde cualquier pantalla
	readonly currentUser = signal<AuthUsrSessionDTO | null>(null);

	login(credentials: LoginRequestDTO): Observable<LoginResponseDTO> {
		return this.http
			.post<LoginResponseDTO>(`${this.apiUrl}/login`, credentials, {
				withCredentials: true, // Indispensable para enviar/recibir la cookie device_shop_id
			})
			.pipe(
				tap((response) => {
					if (response.ok && response.user) {
						this.currentUser.set(response.user);
					}
				}),
			);
	}

	logout(): void {
		this.currentUser.set(null);
	}
}
