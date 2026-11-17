import { TestBed } from '@angular/core/testing';
import { Guiones } from './guiones';

describe('Guiones', () => {
  let service: Guiones;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Guiones);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
