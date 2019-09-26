import { Injectable } from "@angular/core";
import { Socket } from "ngx-socket-io";
import { environment } from "@env/environment";
import { HttpClient, HttpHeaders } from "@angular/common/http";
import { Observable, forkJoin } from "rxjs";
import { AuthenticationService } from "@app/authentication/authentication.service";

@Injectable()
export class TicketService extends Socket {
  observable: Observable<any>;
  private api: string = environment.url_server;

  constructor(
    private httpClient: HttpClient,
    private authService: AuthenticationService
  ) {
    super({
      url: environment.wsUrl + "/ticket",
      options: {}
    });
    //this.wsService.socket.ioSocket.nsp = '/ticket';
  }

  private request(
    method: string,
    endpoint: string,
    body?: any
  ): Observable<any> {
    const url = this.api + endpoint;
    return this.httpClient.request(method, `${url}`, {
      body,
      headers: this.authService.obtenerToken()
    });
  }

  // Asignamos la ventanilla en Ticket y guardamos nuevo registro en DetEstadoTicket
  asignarVentanilla(idticket: number, idventanilla: number) {
    return this.request("PUT", `ticket/${idticket}/asignar/${idventanilla}`);
  }

  guardarNuevoEstado(idticket: number, idestado: number) {
    return this.request("POST", `ticket/${idticket}/estado/${idestado}`);
  }

  derivarTicket(idticket: number, idventanilla: number) {
    return this.request("POST", `ticket/${idticket}/derivar/${idventanilla}`);
  }

  actualizarTematicaOrTramite(idticket, data) {
    return this.request("PUT", `ticket/${idticket}/tematica/tramite`, data);
  }

  obtenerTicketsDia() {
    return (this.observable = new Observable(observer => {
      this.emit("[TICKET] Lista", {}, tickets => observer.next(tickets));
    }));
  }

  ticketUrgente() {
    return this.fromEvent("[TICKET] URGENTE");
  }

  ventanillaAsignadaAlTicket() {
    return this.fromEvent("ventanillaAsignadaAlTicket");
  }

  nuevoEstadoTicket() {
    return this.fromEvent("[TICKET] NUEVO ESTADO");
  }

  ticketDerivado() {
    return this.fromEvent("[TICKET] DERIVADO");
  }

  nuevoTicket() {
    return this.fromEvent("[TICKET] Nuevo");
  }

  // Esto va para el administrador
  ticketSinAtender() {
    return this.fromEvent("ticketSinAtender");
  }
}
