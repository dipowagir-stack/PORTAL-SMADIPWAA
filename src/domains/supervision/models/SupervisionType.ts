import { ValueObject } from '../../../foundation/core/ValueObject';

interface SupervisionTypeProps {
  value: 'Akademik' | 'Klinis' | 'Manajerial';
}

export class SupervisionType extends ValueObject<SupervisionTypeProps> {
  private constructor(props: SupervisionTypeProps) {
    super(props);
  }

  public static create(value: 'Akademik' | 'Klinis' | 'Manajerial'): SupervisionType {
    return new SupervisionType({ value });
  }

  get value(): string {
    return this.props.value;
  }
}
