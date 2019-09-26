import { Injectable } from "@angular/core";
import { HttpClient, HttpHeaders } from "@angular/common/http";
import { environment } from "@env/environment";
import { Observable } from "rxjs";
import { AuthDTO, AuthRO } from "./auth.dto";
import { map } from "rxjs/operators";
import {
  USUARIO,
  ACCES_TOKEN,
  VENTANILLA
} from "@app/shared/constants/auth.constants";
import { Usuario } from "@app/core/models/usuario.model";
import { VentanillaService } from "@app/core/services/ventanilla/ventanilla.service";
import { JwtHelperService } from "@auth0/angular-jwt";
import { Router } from "@angular/router";

@Injectable({
  providedIn: "root"
})
export class AuthenticationService {
  private api: string = environment.url_server;
  public usuario: Usuario = new Usuario();
  public auth: AuthRO = new AuthRO();
  helper = new JwtHelperService();
  headers: HttpHeaders;

  constructor(
    private httpClitent: HttpClient,
    private ventanillaService: VentanillaService,
    private router: Router
  ) {
    this.cargarStorage();
  }

  public obtenerToken() {
    return (this.headers = new HttpHeaders({
      Authorization: "Bearer " + localStorage.getItem(ACCES_TOKEN)
    }));
  }

  private request(method, endpoint, body?): Observable<any> {
    const url = this.api + endpoint;
    return this.httpClitent.request(method, url, { body });
  }

  login(auth: AuthDTO) {
    return this.request("POST", "usuario/login", auth).pipe(
      map((auth: AuthRO) => {
        this.guardarStorage(auth);
        return true;
      })
    );
  }

  guardarStorage({ ventanilla, token, ...usuario }: AuthRO) {
    localStorage.setItem(USUARIO, JSON.stringify(usuario));
    localStorage.setItem(VENTANILLA, JSON.stringify(ventanilla));
    localStorage.setItem(ACCES_TOKEN, token);
    this.auth = { ventanilla, token, ...usuario };
    this.ventanillaService.ventanillaS.next(ventanilla);
  }

  cargarStorage() {
    if (
      localStorage.getItem(USUARIO) &&
      localStorage.getItem(ACCES_TOKEN) &&
      localStorage.getItem(VENTANILLA)
    ) {
      const usuario = JSON.parse(localStorage.getItem(USUARIO));
      const ventanilla = JSON.parse(localStorage.getItem(VENTANILLA));
      const token = localStorage.getItem(ACCES_TOKEN);
      this.auth = { ventanilla, token, ...usuario };
      this.ventanillaService.ventanillaS.next(ventanilla);
    } else {
      this.auth = new AuthRO();
    }
  }

  borrarStorage() {
    localStorage.removeItem(USUARIO);
    localStorage.removeItem(ACCES_TOKEN);
    localStorage.removeItem(VENTANILLA);
    this.auth = new AuthRO();
    this.router.navigate(["/authentication"]);
  }

  estaLogueado(): boolean {
    const token = localStorage.getItem(ACCES_TOKEN);
    try {
      this.helper.decodeToken(token);
    } catch (err) {
      this.router.navigate(["/authentication"]);
    }
    return !this.helper.isTokenExpired(token);
  }
}
