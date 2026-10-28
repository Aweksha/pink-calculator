import { Component, signal } from '@angular/core';
import {
  LinearResult,
  matrixOps,
  parseMatrix,
  parseVector,
  runLinear,
  vectorOps,
} from '../../services/linear-algebra';
import { MatrixView } from '../../components/matrix-view/matrix-view';
import { formatNumber } from '../../services/math-engine';

interface Operation {
  label: string;
  aria: string;
  run: (inputs: LinearAlgebra) => LinearResult;
}

@Component({
  selector: 'app-linear-algebra',
  imports: [MatrixView],
  templateUrl: './linear-algebra.html',
  styleUrl: './linear-algebra.scss',
})
export class LinearAlgebra {
  protected readonly matrixA = signal('1 2\n3 4');
  protected readonly matrixB = signal('5 6\n7 8');
  protected readonly vectorU = signal('1, 2, 3');
  protected readonly vectorV = signal('4, 5, 6');

  protected readonly resultLabel = signal('');
  protected readonly result = signal<LinearResult | null>(null);

  protected readonly format = (v: number) => formatNumber(v, 10);

  private a = () => parseMatrix(this.matrixA(), 'A');
  private b = () => parseMatrix(this.matrixB(), 'B');
  private u = () => parseVector(this.vectorU(), 'u');
  private v = () => parseVector(this.vectorV(), 'v');

  protected readonly matrixOperations: Operation[] = [
    {
      label: 'A + B',
      aria: 'Add A and B',
      run: (c) => runLinear(() => matrixOps.add(c.a(), c.b())),
    },
    {
      label: 'A − B',
      aria: 'Subtract B from A',
      run: (c) => runLinear(() => matrixOps.subtract(c.a(), c.b())),
    },
    {
      label: 'A × B',
      aria: 'Multiply A by B',
      run: (c) => runLinear(() => matrixOps.multiply(c.a(), c.b())),
    },
    {
      label: 'Aᵀ',
      aria: 'Transpose of A',
      run: (c) => runLinear(() => matrixOps.transpose(c.a())),
    },
    {
      label: 'det(A)',
      aria: 'Determinant of A',
      run: (c) => runLinear(() => matrixOps.determinant(c.a())),
    },
    { label: 'A⁻¹', aria: 'Inverse of A', run: (c) => runLinear(() => matrixOps.inverse(c.a())) },
    {
      label: 'A·v',
      aria: 'Multiply A by vector v',
      run: (c) => runLinear(() => matrixOps.matVec(c.a(), c.v())),
    },
    {
      label: 'Solve Ax = v',
      aria: 'Solve the linear system A x equals v',
      run: (c) => runLinear(() => matrixOps.solve(c.a(), c.v())),
    },
  ];

  protected readonly vectorOperations: Operation[] = [
    {
      label: 'u · v',
      aria: 'Dot product of u and v',
      run: (c) => runLinear(() => vectorOps.dot(c.u(), c.v())),
    },
    {
      label: 'u × v',
      aria: 'Cross product of u and v',
      run: (c) => runLinear(() => vectorOps.cross(c.u(), c.v())),
    },
    {
      label: '|u|',
      aria: 'Magnitude of u',
      run: (c) => runLinear(() => vectorOps.magnitude(c.u())),
    },
    {
      label: 'û',
      aria: 'Unit vector of u',
      run: (c) => runLinear(() => vectorOps.normalize(c.u())),
    },
    {
      label: '|v|',
      aria: 'Magnitude of v',
      run: (c) => runLinear(() => vectorOps.magnitude(c.v())),
    },
    {
      label: 'v̂',
      aria: 'Unit vector of v',
      run: (c) => runLinear(() => vectorOps.normalize(c.v())),
    },
  ];

  protected apply(op: Operation): void {
    this.resultLabel.set(op.label);
    this.result.set(op.run(this));
  }

  protected text(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }
}
