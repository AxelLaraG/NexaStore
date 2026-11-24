import {
	NonNullableFormBuilder,
	ReactiveFormsModule,
	Validators,
} from "@Angular/forms";
import type { LoginRequestDTO } from "@NexaStore/shared";
import { Component, inject, signal } from "@angular/core";
import { Router } from "@angular/router";
import { HlmButtonImports } from "@spartan-ng/helm/button";
import { HlmCardImports } from "@spartan-ng/helm/card";
import { HlmInputImports } from "@spartan-ng/helm/input";
import { HlmLabelImports } from "@spartan-ng/helm/label";
import { Auth } from "../../core/services/auth";

@Component({
	selector: "app-login",
	imports: [
		ReactiveFormsModule,
		HlmCardImports,
		HlmLabelImports,
		HlmInputImports,
		HlmButtonImports,
	],
	host: { class: "w-full max-w-md" },
	templateUrl: "./login.html",
	styleUrl: "./login.css",
})
export class Login {
	private readonly fb = inject(NonNullableFormBuilder);
	private readonly authServ = inject(Auth);
	private readonly router = inject(Router);
	readonly isLoading = signal(false);
	readonly errorMessage = signal<string | null>(null);

	readonly loginForm = this.fb.group({
		email: ["", Validators.required, Validators.email],
		password: ["", Validators.required, Validators.minLength(8)],
	});

	onSubmit(): void {
		if (this.loginForm.invalid) {
			this.loginForm.markAllAsTouched();
			return;
		}

		this.isLoading.set(true);
		this.errorMessage.set(null);

		const payload: LoginRequestDTO = this.loginForm.getRawValue();

		this.authServ.login(payload).subscribe({
			next: (res) => {
				this.isLoading.set(false);

				if (!res.ok || !res.user) {
					this.errorMessage.set(res.message || "Error al iniciar sesión");
					return;
				}

				if (res.user.role === "Vendedor") {
					this.router.navigate(["/pos"]);
				} else {
					this.router.navigate(["/dashboard"]);
				}
			},
			error: (err) => {
				this.isLoading.set(false);
				const backendMsg =
					err.error?.message || "No se pudo conectar con el servidor";
				this.errorMessage.set(backendMsg);
			},
		});
	}
}
