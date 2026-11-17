import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { NzMessageService } from 'ng-zorro-antd/message';
import { GuionesService, GuionItem } from '../../services/guiones';

@Component({
  selector: 'app-guiones-aprobados',
  standalone: true,
  imports: [CommonModule, NzIconModule, NzPopconfirmModule],
  templateUrl: './guiones-aprobados.html',
  styleUrl: './guiones-aprobados.scss'
})
export class GuionesAprobados {
  guionesService = inject(GuionesService);
  private message = inject(NzMessageService);

  guionSeleccionado = signal<GuionItem | null>(null);

  seleccionarGuion(item: GuionItem) {
    this.guionSeleccionado.set(item);
  }

  async confirmarYGenerarVideo(item: GuionItem, event?: Event) {
    event?.stopPropagation();
    try {
      const url = await this.guionesService.generarVideoDesdeGuion(item);
      if (url) {
        this.message.success('¡Video generado y listo para descargar!');
      } else {
        this.message.warning('n8n procesó la solicitud pero no devolvió una URL de video.');
      }
    } catch {
      this.message.error('Error al conectar con el workflow de video en n8n.');
    }
  }

  copiarGuion(texto: string, event?: Event) {
    event?.stopPropagation();
    navigator.clipboard.writeText(texto);
    this.message.success('Guion copiado al portapapeles');
  }

  eliminarAprobado(id: string, event?: Event) {
    event?.stopPropagation();
    if (this.guionSeleccionado()?.id === id) {
      this.guionSeleccionado.set(null);
    }
    this.guionesService.eliminarGuion(id);
    this.message.info('Guion eliminado de aprobados');
  }
}