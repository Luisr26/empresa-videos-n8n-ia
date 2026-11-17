import { Component, computed, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';

import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzStatisticModule } from 'ng-zorro-antd/statistic';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzEmptyModule } from 'ng-zorro-antd/empty';

import { GuionesService } from '../../services/guiones';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    DatePipe,
    RouterLink,
    NzGridModule,
    NzCardModule,
    NzStatisticModule,
    NzIconModule,
    NzButtonModule,
    NzTagModule,
    NzEmptyModule
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss'
})
export class Dashboard {
  guionesService = inject(GuionesService);

  totalAprobados = computed(() => this.guionesService.guionesAprobados().length);

  promedioViral = computed(() => {
    const lista = this.guionesService.guionesAprobados();
    if (!lista.length) return 0;
    const suma = lista.reduce((acc, item) => acc + item.probabilidadViral, 0);
    return Math.round(suma / lista.length);
  });

  mejorPuntaje = computed(() => {
    const lista = this.guionesService.guionesAprobados();
    if (!lista.length) return 0;
    return Math.max(...lista.map((g) => g.probabilidadViral));
  });

  ultimosGuiones = computed(() => this.guionesService.guionesAprobados().slice(0, 5));
}