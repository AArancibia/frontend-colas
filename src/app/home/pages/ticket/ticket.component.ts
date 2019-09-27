import { AfterViewInit, Component, OnDestroy, OnInit } from "@angular/core";
import { WebsocketService } from "@app/core/services/websocket/websocket.service";
import { TicketService } from "@app/core/services/ticket/ticket.service";
import { Ticket } from "@app/core/models/ticket.model";
import { tap, map } from "rxjs/operators";
import { Tramite } from "@app/core/models/tramite.model";
import { Tematica } from "@app/core/models/tematica.model";
import { TematicaService } from "@app/core/services/tematica/tematica.service";
import { SnackbarService } from "ngx-snackbar";
import { TramiteService } from "@app/core/services/tramite/tramite.service";
import { Administrado } from "@app/core/models/administrado.model";
import { DetEstadoTicket } from "@app/core/models/detestadoticket.model";
import { NzNotificationService } from "ng-zorro-antd";
import { VentanillaService } from "@app/core/services/ventanilla/ventanilla.service";
import { Ventanilla } from "@app/core/models/ventanilla.model";
import { Router } from "@angular/router";
import { AuthenticationService } from "@app/authentication/authentication.service";
import { VentanillaReferencia } from "@app/core/models/ventanillareferencia.model";

/**
 * @author Alexis Arancibia Sanchez <aarancibia4251@gmail.com>
 */
/**
 * Ticket component
 */
@Component({
  selector: "app-ticket",
  templateUrl: "./ticket.component.html",
  styleUrls: ["./ticket.component.scss"]
})
export class TicketComponent implements OnInit, AfterViewInit {
  listTematica: Tematica[] = [];
  listTicket: any[] = [];
  listaTramites: Tramite[] = [];
  mostrarInfoAdministrado: Administrado = new Administrado();
  selectTicket: Ticket;
  validacionEstados: DetEstadoTicket;
  listVentanillas: Ventanilla[] = [];
  idtematica: number;
  //idtramite: number;
  ventanilla: number; // Esto solo tiene el id
  derivar: boolean = false;
  ventanillaDerivar: any;
  visible: boolean;
  inputTramites: string;
  inputTematicas: string;
  pasos: number = 0;
  detallesTramite: any;
  activo: number = 0;
  estadoVentanilla: number = 0;
  datosVentanilla: Ventanilla = new Ventanilla();
  referencias: VentanillaReferencia[] = [];

  constructor(
    private wsSocket: WebsocketService,
    public ticketService: TicketService,
    public tematicaService: TematicaService,
    public tramiteService: TramiteService,
    private notificationService: NzNotificationService,
    private snackBar: SnackbarService,
    private ventanillaService: VentanillaService,
    private authenticationService: AuthenticationService,
    private router: Router
  ) {}

  /**
   * Funcion ngOnInit de Angular
   *
   */
  ngOnInit() {
    this.mostrarInfoAdministrado = {};
    this.cargarReferencias();
    this.validacionEstados = null;
    //this.idtramite = null;
    this.pasos = 0;
    this.datosVentanilla = this.authenticationService.auth.ventanilla;
    this.listarVentanillas();
    this.ventanilla = this.datosVentanilla.id;
    this.listarTickets();
    this.derivar = false;
    this.cargarConfiguracion();
  }

  cargarReferencias() {
    this.ticketService
      .encontrarReferencia()
      .pipe(map(referencias => (this.referencias = referencias)))
      .subscribe();
  }

  cargarConfiguracion() {
    this.nuevoTicket();
    this.ventanillaAsignadaAlTicket();
    this.nuevoEstadoTicket();
    this.ticketDerivado();
    this.ultimoEstadoVentanilla();
    this.ticketUrgente();
  }

  /**
   * Funcion para llamar a servicio de asignar urgente a Ticket
   * @function ticketUrgente
   * @returns {Ticket} Ticket modificado
   */
  ticketUrgente() {
    this.ticketService
      .ticketUrgente()
      .pipe(
        tap((ticketUrgenteBD: Ticket) => {
          if (this.listTicket.length > 0) {
            const indexTicket = this.listTicket.findIndex(
              (ticket: Ticket) => ticket.codigo == ticketUrgenteBD.codigo
            );
            this.listTicket.splice(indexTicket, 1);
            this.listTicket.splice(1, 0, ticketUrgenteBD);
            this.listTicket = [...this.listTicket];
          }
        })
      )
      .subscribe();
  }

  listarTickets() {
    this.ticketService
      .obtenerTicketsDia()
      .pipe(
        tap((tickets: Ticket[]) => {
          this.listTicket =
            tickets.length > 0
              ? tickets.filter(
                  ticket =>
                    ticket.idventanilla == this.ventanilla ||
                    !ticket.idventanilla
                )
              : [];

          console.log(this.listTicket);

          const nuevo = [];

          this.listTicket
            .map((ticket: Ticket) => {
              const { idventanilla } = this.referencias.find(
                ref => ref.idreferencial == ticket.idreferencial
              );
              return {
                idventanilla,
                ticket
              };
            })
            .map(({ idventanilla, ticket }) => {
              if (idventanilla == this.ventanilla) {
                return ticket;
              }
            })
            .map(data =>
              data !== undefined || null ? nuevo.push(data) : data
            );

          const filtros = tickets.filter(
            ticket => ticket.idventanilla == this.ventanilla
          );

          //nuevo.push(filtros);
          this.listTicket = [...nuevo, ...filtros];

          // this.ventanilla -- idventanillla

          // for (let i = 0; i < this.listTicket.length; i++) {
          //   const ticket = this.listTicket[i];
          //   if (!ticket.idventanilla) {
          //     const { idventanilla } = this.referencias.find(
          //       ref => ref.idreferencial == ticket.idreferencial
          //     );
          //     if (this.ventanilla == idventanilla) {
          //       this.listTicket = [...this.listTicket, ticket];
          //     } else {
          //       this.listTicket.splice(i, 1);
          //       this.listTicket = [...this.listTicket];
          //     }
          //   }
          // }

          if (this.listTicket.length > 0) {
            const prioridades = {
              1: [],
              2: [],
              3: [],
              4: []
            };
            this.listTicket.forEach((ticket: Ticket) => {
              ticket.detEstados.sort(
                (a, b) =>
                  new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
              );
              const item = ticket.detEstados[0].estadoticketId;
              if ((ticket.urgente && ticket.preferencial) || item > 1) {
                prioridades["1"].push(ticket);
              } else if (ticket.urgente && !ticket.preferencial) {
                prioridades["2"].push(ticket);
              } else if (ticket.preferencial && !ticket.urgente) {
                prioridades["3"].push(ticket);
              } else {
                prioridades["4"].push(ticket);
              }
            });
            this.listTicket.splice(0);
            const ordenados = prioridades["1"]
              .concat(prioridades["2"])
              .concat(prioridades["3"])
              .concat(prioridades["4"]);
            this.listTicket = ordenados;
            // this.listTicket = this.listTicket
            //   .filter(
            //     (ticket: Ticket) =>
            //       ticket.tipoTicket.abr === this.datosVentanilla.tipoatencion
            //   )
            //   .slice();
          }
          if (this.listTicket.length > 0) {
            this.datosTicket(this.listTicket[0]);
            this.masDetalle();
          }
        })
      )
      .subscribe();
  }

  nuevoTicket() {
    this.ticketService
      .nuevoTicket()
      .pipe(
        tap(async (ticket: Ticket) => {
          // if (ticket.tipoTicket.abr !== this.datosVentanilla.tipoatencion)
          //   return;
          let referencia = await this.ticketService
            .encontrarReferencia({ idreferencial: ticket.idreferencial })
            .toPromise();
          referencia = referencia[0];
          if (this.ventanilla !== referencia.idventanilla) return;

          if (this.listTicket.length > 0) {
            this.listTicket.push(ticket);
            const prioridades = {
              1: [],
              2: [],
              3: [],
              4: []
            };
            this.listTicket.forEach((item: Ticket, index) => {
              if (index !== 0) {
                if (item.urgente && item.preferencial) {
                  prioridades["1"].push(item);
                } else if (item.urgente && !item.preferencial) {
                  prioridades["2"].push(item);
                } else if (item.preferencial && !item.urgente) {
                  prioridades["3"].push(item);
                } else {
                  prioridades["4"].push(item);
                }
              } else {
                prioridades["1"].push(item);
              }
            });

            this.listTicket.splice(0);
            const ordenados = prioridades["1"]
              .concat(prioridades["2"])
              .concat(prioridades["3"])
              .concat(prioridades["4"]);
            this.listTicket = ordenados;
          } else {
            this.listTicket.push(ticket);
            this.listTicket = [...this.listTicket];
          }

          if (this.listTicket.length <= 1) {
            this.datosTicket(this.listTicket[0]);
            this.masDetalle();
          }
        })
      )
      .subscribe();
  }

  estadosTickets(estado: number) {
    if (this.estadoVentanilla === 4) return;
    switch (estado) {
      // LLAMANDO
      case 2: {
        if (this.validacionEstados.estadoticketId === 3) {
          return;
        } else if (
          this.validacionEstados.estadoticketId === 1 ||
          this.validacionEstados.estadoticketId === 2
        ) {
          this.snackBar.add({
            msg: `Llamando ticket ${this.selectTicket.codigo}`,
            background: "#000000",
            color: "#ffffff",
            customClass: ".snack-message",
            action: {
              text: `Quitar`,
              onClick: () => {},
              color: "#108ee9"
            },
            timeout: 3000,
            onRemove: () => {
              this.snackBar.clear();
            }
          });
        }
        this.ticketService
          .asignarVentanilla(this.selectTicket.id, this.ventanilla)
          .pipe(tap(() => (this.activo = estado)))
          .subscribe();
        return;
      }
      // ATENDIENDO
      case 3: {
        if (this.validacionEstados.estadoticketId !== 2) return;
        this.ticketService
          .guardarNuevoEstado(this.selectTicket.id, 3)
          .pipe(
            tap(() => {
              this.derivar = true;
              this.activo = estado;
            })
          )
          .subscribe();
        return;
      }
      // ATENDIDO
      case 4: {
        console.log(this.selectTicket);
        console.log(this.validacionEstados.estadoticketId);
        // if (
        //   //!this.selectTicket.idtramite &&
        //   this.validacionEstados.estadoticketId !== 2
        // )
        //   return;
        // if (this.selectTicket.idtramite !== this.idtramite) {
        //   this.notificationService.error(
        //     "Notificación",
        //     "No ha guardado los ultimos cambios en Asignar Tramite",
        //     {
        //       nzPauseOnHover: true
        //     }
        //   );
        //   return;
        // }
        //if (this.validacionEstados.estadoticketId === 1) return;
        const idestado = this.validacionEstados.estadoticketId === 2 ? 6 : 4;
        this.ticketService
          .guardarNuevoEstado(this.selectTicket.id, idestado)
          .pipe(
            tap(() => {
              this.activo = 0;
              this.derivar = false;
              this.pasos = 0;
            })
          )
          .subscribe();
        return;
      }
      // DERIVADO
      case 5: {
        if (this.ventanillaDerivar == 0) return;
        this.ticketService
          .derivarTicket(this.selectTicket.id, this.ventanillaDerivar)
          .pipe(
            tap(() => {
              this.activo = 0;
              this.ventanillaDerivar = 0;
            })
          )
          .subscribe();
        return;
      }
    }
  }

  ticketDerivado() {
    this.ticketService
      .ticketDerivado()
      .pipe(
        tap((derivado: any) => {
          const ticket: Ticket = derivado.ticketaEmitir;
          const ventanillaAntigua = derivado.ventanillaAntigua;
          if (ticket.idventanilla == this.ventanilla) {
            this.listTicket.splice(1, 0, ticket);
            this.notificationService.config({
              nzPlacement: "topLeft"
            });
            this.notificationService.info(
              `Ticket Derivado - Correlativo ${ticket.codigo}`,
              `Nuevo ticket derivado en tu lista de tickets`
            );
          }
          if (this.ventanilla == ventanillaAntigua) {
            const ticketaSacar = this.listTicket.findIndex(
              (item: Ticket) => item.codigo === ticket.codigo
            );
            this.listTicket.splice(ticketaSacar, 1);
            this.derivar = false;
            this.pasos = 0;
          }
          this.listTicket = [...this.listTicket];
          this.datosTicket(this.listTicket[0]);
          // if (this.listTicket[0] && this.listTicket[0].idtematica === null) {
          //   this.notificationService.create(
          //     "warning",
          //     "Notificación",
          //     "Ticket vino sin Tematica"
          //   );
          // }
        })
      )
      .subscribe();
  }

  nuevoEstadoTicket() {
    this.ticketService
      .nuevoEstadoTicket()
      .pipe(
        tap((ticket: Ticket) => {
          const indexTicketAtendido = this.listTicket.findIndex(
            (item: Ticket) => item.codigo === ticket.codigo
          );
          if (ticket.idventanilla === this.ventanilla) {
            this.listTicket.splice(indexTicketAtendido, 1, ticket);
            for (let i = 0; i <= ticket.estadosIds.length; i++) {
              if (ticket.estadosIds[i] === 4 || ticket.estadosIds[i] === 6) {
                this.listTicket.splice(indexTicketAtendido, 1);
                break;
              }
            }
          }
          this.listTicket = [...this.listTicket];
          this.datosTicket(this.listTicket[0]);
          if (
            this.listTicket.length > 0 &&
            ticket.idventanilla === this.ventanilla
          )
            this.masDetalle();
          /*if ( this.listTicket[ 0 ].idtematica === null
            && this.validacionEstados.estadoticketId === 1
            && ticket.idventanilla === this.ventanilla  ) {
            this.notificationService.create(
              'warning', 'Notificación',
              'Ticket vino sin Tematica',
            );
          }*/
        })
      )
      .subscribe();
  }

  ventanillaAsignadaAlTicket() {
    this.ticketService
      .ventanillaAsignadaAlTicket()
      .pipe(
        tap((ticket: Ticket) => {
          const indexTicket = this.listTicket.findIndex(
            item => item.codigo == ticket.codigo
          );
          if (ticket.idventanilla != this.ventanilla) {
            if (indexTicket > -1) {
              this.listTicket.splice(indexTicket, 1);
            }
          } else {
            this.listTicket.splice(indexTicket, 1, ticket);
          }
          this.listTicket = [...this.listTicket];
          this.datosTicket(this.listTicket[0]);
          if (ticket.idventanilla === this.ventanilla) {
            this.masDetalle();
          }
        })
      )
      .subscribe();
  }

  datosTicket(ticket: Ticket) {
    if (ticket) {
      this.selectTicket = ticket;
      //this.mostrarInfoAdministrado = { ...this.selectTicket.administrado };
      this.selectTicket.detEstados.sort(
        (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
      );
      this.validacionEstados = this.selectTicket.detEstados[0];
      if (this.validacionEstados.estadoticketId === 3) {
        this.derivar = true;
      }
    } else {
      this.mostrarInfoAdministrado = {};
      this.selectTicket = null;
      this.validacionEstados = null;
      //this.idtramite = null;
    }
  }

  masDetalle() {
    // this.idtramite = this.selectTicket.idtramite;
    // if (this.selectTicket.idtematica === null) {
    //   this.pasos = 0;
    // } else {
    //   this.listarTramitePorTematica(this.selectTicket.idtematica);
    // }
    // if (
    //   this.selectTicket.idtramite &&
    //   this.validacionEstados.estadoticketId === 3
    // ) {
    //   this.mostrarDetalleTramite(this.selectTicket.idtramite);
    // }
  }

  getTematica(idtematica) {
    const tematica = this.listTematica.find(
      item => item.idtematica === idtematica
    );
    return tematica ? tematica.nombre : "";
  }

  mostrarDetalleTramite(idtramite) {
    // this.tramiteService
    //   .obtenerDetallesDeTramite(idtramite)
    //   .pipe(
    //     tap(detalleTramite => {
    //       this.detallesTramite = detalleTramite;
    //       this.selectTicket.idtramite = idtramite;
    //       this.pasos = 2;
    //     })
    //   )
    //   .subscribe();
  }

  getTramite(idtramite) {
    const tramite = this.listaTramites.find(
      item => item.idtramite === idtramite
    );
    return tramite ? tramite.descripcion : "";
  }

  listarVentanillas() {
    this.ventanillaService
      .obtenerVentanillas()
      .pipe(
        tap((ventanillas: Ventanilla[]) => {
          this.listVentanillas = ventanillas.filter(
            (ventanilla: Ventanilla) => ventanilla.id !== this.ventanilla
          );
          // .filter(
          //   (ventanilla: Ventanilla) =>
          //     ventanilla.tipoatencion === this.datosVentanilla.tipoatencion
          // );
        })
      )
      .subscribe();
  }

  bloquearActivarVentanilla(idestado) {
    if (this.validacionEstados && this.validacionEstados.estadoticketId > 1)
      return;
    this.ventanillaService
      .bloquearActivarVentanilla(this.ventanilla, idestado)
      .pipe(
        tap((resp: any) => {
          this.estadoVentanilla = +resp.tbEstadoventanillaId;
        })
      )
      .subscribe();
  }

  imprimirDetalleTramite() {
    const tramite: any = this.detallesTramite[0];
    let ventana = window.open("", "IMPRIMIR", "height=100%;");
    ventana.document.open();
    ventana.document.write(
      `
        <html>
          <head>
            <title>Descripcion del Procedimiento</title>
            <link rel="stylesheet" href="assets/css/font/flaticon.css">
          </head>
          <style>
              .u-margin-top-small {
                margin-top: 2rem;
              }
          </style>
        </html>
        <body onload="window.print();window.close()">
          <div *ngFor="let detalleTramite of detallesTramite">
        <h5 class="detalle__titulo">Descripción del Procedimiento</h5>
        <p class="detalle__descripcion">
          ${tramite.descripcion}
        </p>
        ${tramite.casos.forEach(caso => {
          return `
                <div >
                  ${caso.nombre}
                  <h5 class="detalle__titulo">Requisitos</h5>
                  <ul class="detalle__requisitos" >
                  ${caso.requisitos.map(requisito => {
                    return `
                            <li class="detalle__requisitos--item">
                              <label nz-checkbox >${requisito.descripcion}</label>
                            </li>
                          `;
                  })}
                  </ul>
                </div>
              `;
        })}
        <h5 class="detalle__titulo">Notas</h5>
        <p class="detalle__descripcion">colocar las obervaciones o informacion necesaria que facilite el entendimiento del procedimiento</p>
        <h5 class="detalle__titulo">Canales de Atencion</h5>
        <p class="detalle__descripcion">Presencial, Virtual, Telefonica</p>
        <div class="detalle_row">
          <h5 class="detalle__titulo">Pago por derecho de tramitación</h5>
          <p class="detalle__descripcion">$/ 500000.00</p>
        </div>
        <h5 class="detalle__titulo">Modalidad de Pago</h5>
        <p>Tarjeta de debito y crédito, agencia bancaria transferencia</p>
        <div class="detalle_row">
          <h5 class="detalle__titulo">Plazo</h5>
          <p class="detalle__descripcion">25 días</p>
        </div>
        <div class="detalle_row">
          <h5 class="detalle__titulo">Calificación</h5>
          <p class="detalle__descripcion">Aprobación automatica</p>
        </div>
        <h5 class="detalle__titulo">Sedes y horarios de atención</h5>
        <p class="detalle__descripcion">Colacar las sedees</p>
        <h5 class="detalle__titulo">Instancias de resolución de recursos</h5>
        <p class="detalle__descripcion">Reconsideracion unidad - presentacion 25 dias/ respuesta 25 dás</p>
        <p class="detalle__descripcion">Apelación unidad - presentacion 25 dias/ respuesta 25 dias</p>
        <h5 class="detalle__titulo">Base Legal</h5>
        <div class="u-margin-bottom-medium">
          <p class="detalle__descripcion" *ngFor="let blegales of detalleTramite.baseslegales">
            {{ blegales.descripcion }}
          </p>
        </div>
      </div>
        </body>
      `
    );
  }

  ngAfterViewInit(): void {
    const card: any = document.getElementById("card__ticket");
    const cardExtra: any = card.querySelector(".ant-card-extra");
    const cardHead: any = card.querySelector(".ant-card-head");
    const cardBody: any = card.querySelector(".ant-card-body");
    const cardList: any = card.querySelector(".ant-spin-nested-loading");
    const cardFooter: any = card.querySelector(".ant-list-footer");
    cardExtra.style.width = "100%";
    cardHead.style.height = "16%";
    cardBody.style.height = "74%";
    cardBody.style.padding = "0px";
    cardList.style.height = "100%";
    cardList.style.overflow = "auto";
    cardFooter.style.paddingBottom = "0px";
    cardFooter.style.paddingTop = "0px";
    this.renderCardRight();
  }

  renderCardRight() {
    // const cardRight: any = document.getElementById("card__right");
    // const cardExtraRight: any = cardRight.querySelector(".ant-card-extra");
    // cardExtraRight.style.width = "100%";
  }

  ultimoEstadoVentanilla() {
    if (!this.ventanilla) return;
    this.ventanillaService
      .ultimoEstado(this.ventanilla)
      .pipe(
        tap((estadoVentanilla: any) => {
          this.estadoVentanilla =
            estadoVentanilla !== null
              ? estadoVentanilla.tbEstadoventanillaId
              : 3;
        })
      )
      .subscribe();
  }

  mostrarSatisfaccion() {
    //const contenido = document.getElementById( div ).innerHTML;
    let ventana = window.open("", "IMPRIMIR", "height=100%;");
    ventana.document.open();
    ventana.document.write(
      `
        <html>
          <head>
            <title>Satisfacción</title>
            <link rel="stylesheet" href="assets/css/font/flaticon.css">
          </head>
          <style>
            .satisfaccion {
              min-height: 90vh;
              margin: 0 auto;
              background-color: #ffffff;
              padding: 1.5rem;
              width: 30rem;
              border: 1px solid #8d8d8d;;
            }
            
            .satisfaccion__consulta {
              padding: .5rem 0;
            }
            
            .satisfaccion__consulta-caritas {
                display: flex;
                flex-direction: row;
                flex-wrap: wrap;
                justify-content: space-around;
                align-items: center;
            }
            
            .satisfaccion__consulta-caritas p {
              text-align: center;
            }
            
            .satisfaccion__consulta-caritas i {
              font-size: 3rem;
            }
            
            .satisfaccion__consulta-pregunta {
                  margin-bottom: .5rem;
            }
            
            .satisfaccion__caja {
                display: flex;
                flex-direction: row;
              }
              
              .satisfaccion__caja h2 {
                text-align: center;
                width: 30%;
              }
              
              .satisfaccion__titulo {
                padding: 0;
                margin-top: .5rem;
                margin-bottom: -.5rem;
                text-align: center;
              }
              .u-margin-top-small {
                margin-top: 2rem;
              }
          </style>
        </html>
        <body onload="window.print();window.close()">
                <div class="satisfaccion">
    <div class="satisfaccion__caja">
      <h2 class="satisfaccion__caja-codigo">${this.selectTicket.codigo}</h2>
      <p class="satisfaccion__caja-texto">
        Entregar al salir,
        su opinion nos ayuda a mejorar, porque usted nos importa
      </p>
    </div>
    <h1 class="text-center satisfaccion__titulo">
      Medidor de Satisfacción
    </h1>
    <h3 class="text-center satisfaccion__titulo">
      Marque con una "X" o encierre con un circulo "O"
    </h3>
    <div class="u-margin-top-small satisfaccion__consulta">
      <h3 class="satisfaccion__consulta-pregunta">
        ¿La información que se brindó fue útil?
      </h3>
      <div class="u-margin-top-small satisfaccion__consulta-caritas">
        <span>
          <img src="assets/images/002-sad.png" alt="">
          <p>Mal</p>
        </span>
        <span>
          <img src="assets/images/003-surprised.png" alt="">
          <p>Neutral</p>
        </span>
        <span>
          <img src="assets/images/001-happy.png" alt="">
          <p>Bien</p>
        </span>
      </div>
    </div>
    <div class="satisfaccion__consulta">
      <h3 class="satisfaccion__consulta-pregunta">
        ¿Está satisfecho con la atención brindada?
      </h3>
      <div class="u-margin-top-small satisfaccion__consulta-caritas">
        <span>
          <img src="assets/images/002-sad.png" alt="">
          <p>Mal</p>
        </span>
        <span>
          <img src="assets/images/003-surprised.png" alt="">
          <p>Neutral</p>
        </span>
        <span>
          <img src="assets/images/001-happy.png" alt="">
          <p>Bien</p>
        </span>
      </div>
    </div>
    <div class="satisfaccion__consulta">
      <h3 class="satisfaccion__consulta-pregunta">
        ¿Es de su agrado la nueva plataforma?
      </h3>
      <div class="u-margin-top-small satisfaccion__consulta-caritas">
        <span>
          <img src="assets/images/002-sad.png" alt="">
          <p>Mal</p>
        </span>
        <span>
          <img src="assets/images/003-surprised.png" alt="">
          <p>Neutral</p>
        </span>
        <span>
          <img src="assets/images/001-happy.png" alt="">
          <p>Bien</p>
        </span>
      </div>
    </div>
  </div>
        </body>
      `
    );
    ventana.document.close();
  }

  clickMe(): void {
    this.visible = false;
  }

  change(value: boolean): void {
    console.log(value);
  }
}
