import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ShapeThing, ShapeKind } from '../../../../core/models/thing.model';

@Component({
  selector: 'app-shape-thing',
  standalone: true,
  imports: [CommonModule],
  template: `
    <svg
      class="shape-svg"
      [attr.width]="thing.width"
      [attr.height]="thing.height"
      [style.opacity]="thing.data.opacity"
      xmlns="http://www.w3.org/2000/svg"
    >
      <ng-container [ngSwitch]="thing.data.shape">
        <!-- Rect -->
        <rect *ngSwitchCase="'rect'"
          x="2" y="2"
          [attr.width]="thing.width - 4"
          [attr.height]="thing.height - 4"
          [attr.rx]="thing.data.cornerRadius ?? 8"
          [attr.fill]="thing.data.fill"
          [attr.stroke]="thing.data.stroke"
          [attr.stroke-width]="thing.data.strokeWidth"
        />
        <!-- Circle -->
        <ellipse *ngSwitchCase="'circle'"
          [attr.cx]="thing.width / 2"
          [attr.cy]="thing.height / 2"
          [attr.rx]="(thing.width - 4) / 2"
          [attr.ry]="(thing.height - 4) / 2"
          [attr.fill]="thing.data.fill"
          [attr.stroke]="thing.data.stroke"
          [attr.stroke-width]="thing.data.strokeWidth"
        />
        <!-- Diamond -->
        <polygon *ngSwitchCase="'diamond'"
          [attr.points]="diamondPoints()"
          [attr.fill]="thing.data.fill"
          [attr.stroke]="thing.data.stroke"
          [attr.stroke-width]="thing.data.strokeWidth"
        />
        <!-- Triangle -->
        <polygon *ngSwitchCase="'triangle'"
          [attr.points]="trianglePoints()"
          [attr.fill]="thing.data.fill"
          [attr.stroke]="thing.data.stroke"
          [attr.stroke-width]="thing.data.strokeWidth"
        />
        <!-- Arrow -->
        <path *ngSwitchCase="'arrow'"
          [attr.d]="arrowPath()"
          [attr.fill]="thing.data.fill"
          [attr.stroke]="thing.data.stroke"
          [attr.stroke-width]="thing.data.strokeWidth"
        />
        <!-- Star -->
        <polygon *ngSwitchCase="'star'"
          [attr.points]="starPoints()"
          [attr.fill]="thing.data.fill"
          [attr.stroke]="thing.data.stroke"
          [attr.stroke-width]="thing.data.strokeWidth"
        />
      </ng-container>
    </svg>
  `,
  styles: [`:host { display: block; width: 100%; height: 100%; } .shape-svg { display: block; }`],
})
export class ShapeThingComponent {
  @Input({ required: true }) thing!: ShapeThing;

  diamondPoints(): string {
    const w = this.thing.width, h = this.thing.height;
    return `${w/2},2 ${w-2},${h/2} ${w/2},${h-2} 2,${h/2}`;
  }

  trianglePoints(): string {
    const w = this.thing.width, h = this.thing.height;
    return `${w/2},2 ${w-2},${h-2} 2,${h-2}`;
  }

  arrowPath(): string {
    const w = this.thing.width, h = this.thing.height;
    const m = h / 2;
    return `M 2 ${m} L ${w * 0.65} ${m} L ${w * 0.65} ${h * 0.25} L ${w-2} ${m} L ${w * 0.65} ${h * 0.75} L ${w * 0.65} ${m}`;
  }

  starPoints(): string {
    const w = this.thing.width, h = this.thing.height;
    const cx = w / 2, cy = h / 2;
    const outerR = Math.min(w, h) / 2 - 2;
    const innerR = outerR * 0.45;
    const pts: string[] = [];
    for (let i = 0; i < 10; i++) {
      const r = i % 2 === 0 ? outerR : innerR;
      const angle = (i * Math.PI) / 5 - Math.PI / 2;
      pts.push(`${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`);
    }
    return pts.join(' ');
  }
}
