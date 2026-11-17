import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GeneradorGuion } from './generador-guion';

describe('GeneradorGuion', () => {
  let component: GeneradorGuion;
  let fixture: ComponentFixture<GeneradorGuion>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GeneradorGuion],
    }).compileComponents();

    fixture = TestBed.createComponent(GeneradorGuion);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
