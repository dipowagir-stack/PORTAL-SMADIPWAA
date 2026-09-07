import { Parent } from '../types';

export class ParentEntity {
  private constructor(public props: Parent) {}

  public static create(props: Omit<Parent, 'createdAt' | 'updatedAt'> & { id?: string }): ParentEntity {
    const now = Date.now();
    return new ParentEntity({
      ...props,
      createdAt: now,
      updatedAt: now
    });
  }

  public updateProfile(fullName?: string, phoneNumber?: string, address?: string) {
    if (fullName) this.props.fullName = fullName;
    if (phoneNumber) this.props.phoneNumber = phoneNumber;
    if (address) this.props.address = address;
    this.props.updatedAt = Date.now();
  }
}
