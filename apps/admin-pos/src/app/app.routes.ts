import type { Routes } from "@angular/router";
import { CreateUser } from "./auth/create-user/create-user";
import { Login } from "./auth/login/login";
import { NotFound } from "./core/not-found/not-found";

export const routes: Routes = [
	{
		path: "",
		component: Login,
	},
	{
		path: "login",
		component: Login,
	},
	{
		path: "createUser",
		component: CreateUser,
	},
	{ path: "**", component: NotFound },
];
