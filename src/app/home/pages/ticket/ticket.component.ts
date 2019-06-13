import {AfterViewInit, Component, OnDestroy, OnInit} from '@angular/core';
import {WebsocketService} from '@app/core/services/websocket/websocket.service';
import {TicketService} from '@app/core/services/ticket/ticket.service';
import {NotificacionService} from '@app/shared/components/notification/notificacion.service';
import {Ticket} from '@app/core/models/ticket.model';
import {startWith, tap, withLatestFrom} from 'rxjs/operators';
import {Tramite} from '@app/core/models/tramite.model';
import {Tematica} from '@app/core/models/tematica.model';
import {TematicaService} from '@app/core/services/tematica/tematica.service';
import {SnackbarService} from 'ngx-snackbar';
import {TramiteService} from '@app/core/services/tramite/tramite.service';
import {Administrado} from '@app/core/models/administrado.model';
import {tick} from '@angular/core/testing';
import {DetEstadoTicket} from '@app/core/models/detestadoticket.model';

@Component({
  selector: 'app-ticket',
  templateUrl: './ticket.component.html',
  styleUrls: ['./ticket.component.scss']
})
export class TicketComponent implements OnInit, AfterViewInit {
  listTematica: Tematica[] = [];
  listTicket: any[] = [];
  listaTramites: Tramite[] = [];
  mostrarInfoAdministrado: Administrado = new Administrado();
  selectTicket: Ticket;
  validacionEstados: DetEstadoTicket;
  idtematica: number;
  idtramite: number;
  ventanilla: any;
  derivar: boolean = false;
  estado: number = -1;
  ventanillaDerivar: any;
  visible: boolean;
  visibleTematica: boolean;
  inputTramites: string;
  inputTematicas: string;
  pasos: number = 0;
  mostrarTematica: string;
  detallesTramite: any;
  activo: number = 0;
  constructor(
    private wsSocket: WebsocketService,
    public ticketService: TicketService,
    public tematicaService: TematicaService,
    public tramiteService: TramiteService,
    private notificationService: NotificacionService,
    private snackBar: SnackbarService,
  ) {

  }

  ngOnInit() {
    this.listarTematicas();
    this.ventanilla = Number( prompt('Ventanilla' ) );
    this.listarTickets();
    this.nuevoTicket();
    this.ventanillaAsignadaAlTicket();
    this.nuevoEstadoTicket();
    this.ticketDerivado();
  }

  listarTickets() {
    this.ticketService.obtenerTicketsDia()
      .pipe(
        tap( ( tickets: Ticket[] ) => {
          console.log( tickets );
          this.listTicket = tickets.length > 0 ? tickets.filter( ticket => ticket.idventanilla == this.ventanilla || !ticket.idventanilla ) : [];
          if ( this.listTicket.length > 0 ) this.datosTicket( this.listTicket[ 0 ] );
        }),
      )
      .subscribe();
  }

  nuevoTicket() {
    this.ticketService.nuevoTicket()
      .pipe(
        tap( ( ticket: Ticket ) => {
          if ( ticket.preferencial ) {
            this.listTicket.splice( 1, 0, ticket );
          } else {
            this.listTicket = [ ...this.listTicket, ticket];
          }
          this.listTicket = [ ...this.listTicket ];
          if ( this.listTicket.length <= 1 ) this.datosTicket( this.listTicket[ 0 ] );
        }),
      )
      .subscribe();
  }

  estadosTickets( estado: number ) {
    switch ( estado ) {
      // LLAMANDO
      case 2: {
        if ( this.validacionEstados.estadoticketId === 2 || this.validacionEstados.estadoticketId === 3 ) return;
        this.ticketService.asignarVentanilla( this.selectTicket.id, this.ventanilla )
          .pipe(
            tap( () => this.activo = estado ),
          )
          .subscribe();
        return;
      }
      // ATENDIENDO
      case 3: {
        if ( this.validacionEstados.estadoticketId !== 2 ) return;
        this.ticketService.guardarNuevoEstado( this.selectTicket.id, 3 )
          .pipe(
            tap( () => {
              this.derivar = true;
              this.activo = estado;
            }),
          )
          .subscribe();
        return;
      }
      // ATENDIDO
      case 4: {
        if ( this.validacionEstados.estadoticketId === 1 ) return;
        this.ticketService.guardarNuevoEstado( this.selectTicket.id, 4 )
          .pipe(
            tap( () => {
              this.activo = 0;
              this.derivar = false;
            }),
          )
          .subscribe();
        return;
      }
      // DERIVADO
      case 5: {
        if ( this.ventanillaDerivar == 0 ) return;
        this.ticketService.derivarTicket( this.selectTicket.id, this.ventanillaDerivar )
          .pipe(
            tap( () => {
              this.activo = 0;
              this.ventanillaDerivar = 0;
            }),
          )
          .subscribe();
        return;
      }
    }
  }

  ticketDerivado() {
    this.ticketService.ticketDerivado()
      .pipe(
        tap(
          ( derivado: any ) => {
            console.log( derivado );
            const ticket: Ticket = derivado.ticketaEmitir;
            const ventanillaAntigua = derivado.ventanillaAntigua;
            if ( ticket.idventanilla == this.ventanilla ) {
              this.listTicket.splice( 1 , 0, ticket );
            }
            if ( this.ventanilla == ventanillaAntigua ) {
              const ticketaSacar = this.listTicket.findIndex( ( item: Ticket ) => item.codigo === ticket.codigo );
              this.listTicket.splice( ticketaSacar, 1 );
              this.derivar = false;
            }
            this.listTicket = [ ...this.listTicket ];
            this.datosTicket( this.listTicket[ 0 ] );
          }
        ),
      )
      .subscribe();
  }

  nuevoEstadoTicket() {
    this.ticketService.nuevoEstadoTicket()
      .pipe(
        tap( ( ticket: Ticket ) => {
          const indexTicketAtendido = this.listTicket.findIndex( ( item: Ticket ) => item.codigo === ticket.codigo  );
          if ( ticket.idventanilla === this.ventanilla ) {
            this.listTicket.splice( indexTicketAtendido, 1, ticket );
            for ( let i = 0; i <= ticket.estadosIds.length ; i++ ) {
              if ( ticket.estadosIds[ i ] === 4 || ticket.estadosIds[ i ] === 6 ) {
                console.log( 'ya no entras' );
                this.listTicket.splice( indexTicketAtendido, 1 );
                break;
              }
            }
          }
          this.listTicket = [ ...this.listTicket ];
          this.datosTicket( this.listTicket[ 0 ] );
        }),
      )
      .subscribe();
  }

  ventanillaAsignadaAlTicket() {
    this.ticketService.ventanillaAsignadaAlTicket()
      .pipe(
        tap(
          ( ticket: Ticket ) => {
            //console.log( ticket );
            const indexTicket = this.listTicket.findIndex( ( item ) => item.codigo == ticket.codigo );
            console.log( indexTicket );
            if ( ticket.idventanilla != this.ventanilla ) {
              if ( indexTicket > -1 ) {
                this.listTicket.splice( indexTicket , 1 );
              }
            } else {
              this.listTicket.splice( indexTicket , 1, ticket );
            }
            this.listTicket = [ ...this.listTicket ];
            this.datosTicket( this.listTicket[ 0 ] );
          }
        ),
      )
      .subscribe();
  }

  datosTicket( ticket: Ticket ) {
    //console.log( ticket )
    if ( ticket ) {
      this.selectTicket = ticket;
      this.mostrarInfoAdministrado = { ...this.selectTicket.administrado };
      this.listarTramitePorTematica( this.selectTicket.idtematica );
    } else {
      this.mostrarInfoAdministrado = {};
      this.selectTicket = null;
      this.validacionEstados = null;
    }
    console.log( this.selectTicket.detEstados );
    this.selectTicket.detEstados.sort( ( a, b ) => new Date( b.fecha ).getTime() -  new Date( a.fecha ).getTime() );
    this.validacionEstados = this.selectTicket.detEstados[ 0 ];
    if ( this.validacionEstados.estadoticketId === 3 ) {
      this.derivar = true;
    }
  }

  getTematica( idtematica ) {
    const tematica = this.listTematica.find( item => item.idtematica === idtematica );
    return tematica ? tematica.nombre : '';
  }

  mostrarDetalleTramite( idtramite ) {
    this.tramiteService.obtenerDetallesDeTramite( idtramite )
      .pipe(
        tap( ( detalleTramite ) => {
          this.detallesTramite = detalleTramite;
          this.idtramite = idtramite;
          this.pasos = 2;
        }),
      )
      .subscribe();
  }

  getTramite( idtramite ) {
    const tramite = this.listaTramites.find( item => item.idtramite === idtramite );
    return tramite ? tramite.descripcion : '';
  }

  listarTematicas() {
    this.tematicaService.obtenerTematicas()
      .pipe(
        tap( ( tematicas: Tematica[] ) => this.listTematica = tematicas ),
      )
      .subscribe();
  }

  listarTramitePorTematica( idtematica ) {
    this.tematicaService.tramitesByTematica( idtematica )
      .pipe(
        tap( ( tramites: Tramite[] ) => {
          this.listaTramites = tramites;
          this.selectTicket.idtematica = idtematica;
          this.pasos = 1;
        }),
      )
      .subscribe();
  }

  ngAfterViewInit(): void {
    const card: any = document.getElementById('card__ticket');
    const cardExtra: any = card.querySelector('.ant-card-extra');
    const cardHead: any = card.querySelector('.ant-card-head');
    const cardBody: any = card.querySelector('.ant-card-body');
    const cardList: any = card.querySelector('.ant-spin-nested-loading');
    const cardFooter: any = card.querySelector('.ant-list-footer');
    cardExtra.style.width = '100%';
    cardHead.style.height = '16%';
    cardBody.style.height = '74%';
    cardBody.style.padding = '0px';
    cardList.style.height = '100%';
    cardList.style.overflow = 'auto';
    cardFooter.style.paddingBottom = '0px';
    cardFooter.style.paddingTop = '0px';
    this.renderCardRight();
  }

  renderCardRight() {
    const cardRight: any = document.getElementById('card__right');
    const cardExtraRight: any = cardRight.querySelector('.ant-card-extra');
    cardExtraRight.style.width = '100%';
  }

  clickMe(): void {
    this.visible = false;
  }

  change(value: boolean): void {
    console.log(value);
  }

}
