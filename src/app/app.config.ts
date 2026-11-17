import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { PreloadAllModules, provideRouter, withPreloading } from '@angular/router';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { registerLocaleData } from '@angular/common';
import es from '@angular/common/locales/es';

import { es_ES, provideNzI18n } from 'ng-zorro-antd/i18n';
import { provideNzDateFnsAdapter } from 'ng-zorro-antd/core/time';
import { provideNzIcons } from 'ng-zorro-antd/icon';
import {
  VideoCameraOutline,
  DashboardOutline,
  BulbOutline,
  TableOutline,
  MenuFoldOutline,
  MenuUnfoldOutline,
  CheckCircleOutline,
  FireOutline,
  TrophyOutline,
  PlusOutline,
  ThunderboltOutline,
  CheckOutline,
  EditOutline,
  CloseOutline,
  EyeOutline,
  DeleteOutline,
  ApiOutline,
  ArrowRightOutline,
  GlobalOutline,
  SearchOutline,
  CopyOutline,
  SyncOutline
} from '@ant-design/icons-angular/icons';

import { routes } from './app.routes';

registerLocaleData(es);

const icons = [
  VideoCameraOutline,
  DashboardOutline,
  BulbOutline,
  TableOutline,
  MenuFoldOutline,
  MenuUnfoldOutline,
  CheckCircleOutline,
  FireOutline,
  TrophyOutline,
  PlusOutline,
  ThunderboltOutline,
  CheckOutline,
  EditOutline,
  CloseOutline,
  EyeOutline,
  DeleteOutline,
  ApiOutline,
  ArrowRightOutline,
  GlobalOutline,
  SearchOutline,
  CopyOutline,
  SyncOutline
];

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withPreloading(PreloadAllModules)),
    provideHttpClient(withFetch()),
    provideNzI18n(es_ES),
    provideNzDateFnsAdapter(),
    provideNzIcons(icons)
  ],
};