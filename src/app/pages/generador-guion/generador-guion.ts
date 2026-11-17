import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzProgressModule } from 'ng-zorro-antd/progress';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { NzMessageService } from 'ng-zorro-antd/message';
import { GuionesService, GuionItem } from '../../services/guiones';

@Component({
  selector: 'app-generador-guion',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NzIconModule,
    NzSpinModule,
    NzProgressModule,
    NzPopconfirmModule
  ],
  templateUrl: './generador-guion.html',
  styleUrl: './generador-guion.scss'
})
export class GeneradorGuion {
  guionesService = inject(GuionesService);
  private message = inject(NzMessageService);
  private router = inject(Router);

  sesionIdActiva = signal<string | null>(null);
  mensajeInput = signal('');
  instruccionMejora = signal('');
  cargandoChat = signal(false);
  cargandoEstudio = signal(false);
  aprobando = signal(false);
  tabAnalitica = signal<'kpis' | 'mercado'>('kpis');

  sesionActiva = computed<GuionItem | null>(() => {
    const id = this.sesionIdActiva();
    if (!id) return null;
    return this.guionesService.historialSesiones().find((s) => s.id === id) || null;
  });

  nuevaSesion() {
    this.sesionIdActiva.set(null);
    this.mensajeInput.set('');
    this.instruccionMejora.set('');
    this.tabAnalitica.set('kpis');
  }

  seleccionarSesion(sesion: GuionItem) {
    this.sesionIdActiva.set(sesion.id);
    this.tabAnalitica.set('kpis');
  }

  eliminarSesion(id: string) {
    if (this.sesionIdActiva() === id) {
      this.sesionIdActiva.set(null);
    }
    this.guionesService.eliminarDeHistorial(id);
    this.message.info('Conversación eliminada del historial');
  }

  async enviarMensaje(promptPersonalizado?: string) {
    const texto = (promptPersonalizado ?? this.mensajeInput()).trim();
    if (!texto || this.cargandoChat()) return;

    if (!promptPersonalizado) {
      this.mensajeInput.set('');
    } else {
      this.instruccionMejora.set('');
    }

    this.cargandoChat.set(true);

    try {
      const sesionActualizada = await this.guionesService.generarOIterarGuion(
        this.sesionActiva(),
        texto
      );
      this.sesionIdActiva.set(sesionActualizada.id);
      this.tabAnalitica.set('kpis');
    } catch {
      this.message.error('Error al conectar con LM Studio (puerto 1235).');
    } finally {
      this.cargandoChat.set(false);
    }
  }

  async ejecutarEstudioInternet() {
    const sesion = this.sesionActiva();
    if (!sesion || this.cargandoEstudio()) return;

    this.tabAnalitica.set('mercado');
    this.cargandoEstudio.set(true);

    try {
      await this.guionesService.estudiarTemaEnInternet(sesion);
      this.message.success('Estudio de mercado actualizado con noticias reales');
    } catch {
      this.message.error('No se pudo completar el estudio en internet.');
    } finally {
      this.cargandoEstudio.set(false);
    }
  }

  async aprobarGuionActual() {
    const sesion = this.sesionActiva();
    if (!sesion?.guion || this.aprobando()) return;

    this.aprobando.set(true);
    try {
      const formateado = await this.guionesService.formatearGuionConIA(sesion.guion);
      this.guionesService.agregarAprobado({
        ...sesion,
        guionFormateado: formateado || sesion.guion
      });
      this.message.success('Guion aprobado y enviado a producción');
      this.router.navigate(['/aprobados']);
    } catch {
      this.guionesService.agregarAprobado(sesion);
      this.message.success('Guion aprobado');
      this.router.navigate(['/aprobados']);
    } finally {
      this.aprobando.set(false);
    }
  }

  descartarGuionActual() {
    const sesion = this.sesionActiva();
    if (!sesion) return;
    this.guionesService.eliminarDeHistorial(sesion.id);
    this.sesionIdActiva.set(null);
    this.message.info('Borrador descartado');
  }

  copiarTexto(texto: string) {
    navigator.clipboard.writeText(texto);
    this.message.success('Guion copiado al portapapeles');
  }

  colorProbabilidad(valor: number): string {
    if (valor >= 75) return '#10b981';
    if (valor >= 50) return '#f59e0b';
    return '#ef4444';
  }
}