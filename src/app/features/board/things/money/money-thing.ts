import { Component, Input, Output, EventEmitter, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MoneyThing, MoneyData, MoneyItem, MoneyCategory } from '../../../../core/models/thing.model';

const CATEGORY_ICONS: Record<MoneyCategory, string> = {
  transport: 'directions_car',
  accommodation: 'hotel',
  food: 'restaurant',
  activities: 'local_activity',
  shopping: 'shopping_bag',
  other: 'attach_money',
};

@Component({
  selector: 'app-money-thing',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatButtonModule, MatSelectModule, MatFormFieldModule, MatInputModule],
  templateUrl: './money-thing.html',
  styleUrl: './money-thing.scss',
})
export class MoneyThingComponent {
  @Input({ required: true }) thing!: MoneyThing;
  @Output() dataChanged = new EventEmitter<Partial<MoneyData>>();

  categories: MoneyCategory[] = ['transport', 'accommodation', 'food', 'activities', 'shopping', 'other'];

  get total(): number {
    return (this.thing.data.items ?? []).reduce((s, i) => s + (i.amount ?? 0), 0);
  }

  get paidTotal(): number {
    return (this.thing.data.items ?? []).filter(i => i.paid).reduce((s, i) => s + i.amount, 0);
  }

  categoryTotal(cat: MoneyCategory): number {
    return (this.thing.data.items ?? []).filter(i => i.category === cat).reduce((s, i) => s + i.amount, 0);
  }

  categoryIcon(cat: MoneyCategory): string { return CATEGORY_ICONS[cat]; }

  addItem(): void {
    const newItem: MoneyItem = {
      id: Date.now().toString(),
      category: 'other',
      label: '',
      amount: 0,
      paid: false,
    };
    this.dataChanged.emit({ items: [...(this.thing.data.items ?? []), newItem] });
  }

  removeItem(id: string): void {
    this.dataChanged.emit({ items: this.thing.data.items.filter(i => i.id !== id) });
  }

  updateItem(id: string, field: keyof MoneyItem, value: any): void {
    const items = this.thing.data.items.map(i =>
      i.id === id ? { ...i, [field]: value } : i
    );
    this.dataChanged.emit({ items });
  }

  trackById(_: number, item: MoneyItem): string { return item.id; }
}
