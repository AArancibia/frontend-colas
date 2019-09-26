import {
  AfterViewInit,
  Component,
  OnInit,
  TemplateRef,
  ViewChild
} from "@angular/core";
import { UsuarioService } from "@app/core/services/usuario/usuario.service";
import { Usuario } from "@app/core/models/usuario.model";
import { tap } from "rxjs/operators";
import { VentanillaService } from "@app/core/services/ventanilla/ventanilla.service";
import { Ventanilla } from "@app/core/models/ventanilla.model";
import { NzNotificationService } from "ng-zorro-antd";
import { AuthenticationService } from "@app/authentication/authentication.service";
import { AuthRO } from "@app/authentication/auth.dto";

/**
 * Home Component
 */
@Component({
  selector: "app-home",
  templateUrl: "./home.component.html",
  styleUrls: ["./home.component.scss"]
})
/**
 * @author Alexis Arancibia Sanchez <aarancibia4251@gmail.com>
 */
/**
 * Clase HomeComponent
 * @class
 */
export class HomeComponent implements OnInit, AfterViewInit {
  isCollapsed = false;
  triggerTemplate: TemplateRef<void> | null = null;
  @ViewChild("trigger") customTrigger: TemplateRef<void>;
  inputValue: string;
  usuarios: Usuario[] = [];
  usuarioLogueado: AuthRO = new AuthRO();

  /**
   * Constructor de la clase Home.
   * @constructor
   */
  constructor(
    private usuarioService: UsuarioService,
    private ventanillaService: VentanillaService,
    private notificationService: NzNotificationService,
    public authService: AuthenticationService
  ) {
    this.usuarioLogueado = this.authService.auth;
  }

  ngOnInit() {}

  logout() {
    this.authService.borrarStorage();
  }

  /**
   * Funcion que filtra usuarios
   * @function onInput
   * @param {string} nombreUsuario - Nombre del Usuario
   * @returns {(Usuario|Array)} - Lista de Usuarios
   */
  onInput(nombreUsuario: string): void {
    if (!nombreUsuario) return;
    this.usuarioService
      .filtrarUsuarios(nombreUsuario)
      .pipe(
        tap((usuariosFiltrados: Usuario[]) => {
          this.usuarios = usuariosFiltrados;
        })
      )
      .subscribe();
  }

  /**
   * Funcion para obtener Ventanilla por IdUsuario
   * @param {any} idusuario - parametro idusuario
   * @return {Ventanilla} Clase Ventanilla
   */
  guardarVentanilla({ idusuario }) {
    this.ventanillaService
      .obtenerVentanillaporIdUsuario(idusuario)
      .pipe(
        tap((ventanilla: Ventanilla) => {
          if (ventanilla) {
            this.ventanillaService.ventanilla = ventanilla;
            this.ventanillaService.ventanillaS.next(ventanilla);
            this.isCollapsed = true;
          } else {
            this.notificationService.error(
              "No tienes una ventanilla asignada",
              "Consulta con el administrador del Sistema",
              {
                nzDuration: 0
              }
            );
          }
        })
      )
      .subscribe();
  }

  ngAfterViewInit(): void {
    const bottomLeft: any = document.querySelector(
      ".ant-layout-sider-zero-width-trigger"
    );
  }

  /** custom trigger can be TemplateRef **/
  changeTrigger(): void {
    this.triggerTemplate = this.customTrigger;
  }
}
