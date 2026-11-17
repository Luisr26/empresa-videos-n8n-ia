import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GuionesAprobados } from './guiones-aprobados';

describe('GuionesAprobados', () => {
  let component: GuionesAprobados;
  let fixture: ComponentFixture<GuionesAprobados>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GuionesAprobados],
    }).compileComponents();

    fixture = TestBed.createComponent(GuionesAprobados);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
