import {
  subscriptionPlanApiStatusFilterToTab,
  subscriptionPlanStatusBadgeClass,
  subscriptionPlanStatusFilterToApiValue,
  subscriptionPlanStatusLabel,
  subscriptionPlanStatusVariant,
  subscriptionPlanTabToApiStatusFilter
} from './subscription-plan-status.util';

describe('subscription-plan-status.util', () => {
  it('maps backend status values to UI labels', () => {
    expect(subscriptionPlanStatusLabel('draft')).toBe('Draft');
    expect(subscriptionPlanStatusLabel('active')).toBe('Active');
    expect(subscriptionPlanStatusLabel('retired')).toBe('Retired');
    expect(subscriptionPlanStatusLabel('published')).toBe('Active');
    expect(subscriptionPlanStatusLabel('archived')).toBe('Retired');
  });

  it('maps UI tabs to backend status filters', () => {
    expect(subscriptionPlanTabToApiStatusFilter('published')).toBe('active');
    expect(subscriptionPlanTabToApiStatusFilter('archived')).toBe('retired');
    expect(subscriptionPlanTabToApiStatusFilter('draft')).toBe('draft');
    expect(subscriptionPlanTabToApiStatusFilter('all')).toBeUndefined();
  });

  it('maps backend status filters to UI tabs', () => {
    expect(subscriptionPlanApiStatusFilterToTab('active')).toBe('published');
    expect(subscriptionPlanApiStatusFilterToTab('retired')).toBe('archived');
    expect(subscriptionPlanApiStatusFilterToTab('draft')).toBe('draft');
  });

  it('maps dropdown filters to backend query values', () => {
    expect(subscriptionPlanStatusFilterToApiValue('active')).toBe('active');
    expect(subscriptionPlanStatusFilterToApiValue('retired')).toBe('retired');
    expect(subscriptionPlanStatusFilterToApiValue('draft')).toBe('draft');
    expect(subscriptionPlanStatusFilterToApiValue('published')).toBe('active');
    expect(subscriptionPlanStatusFilterToApiValue('archived')).toBe('retired');
  });

  it('maps badge classes from backend status values', () => {
    expect(subscriptionPlanStatusBadgeClass('active')).toBe('published');
    expect(subscriptionPlanStatusBadgeClass('retired')).toBe('archived');
    expect(subscriptionPlanStatusBadgeClass('draft')).toBe('draft');
  });

  it('maps StatusBadge variants from backend status values', () => {
    expect(subscriptionPlanStatusVariant('draft')).toBe('neutral');
    expect(subscriptionPlanStatusVariant('active')).toBe('success');
    expect(subscriptionPlanStatusVariant('retired')).toBe('neutral');
    expect(subscriptionPlanStatusVariant('published')).toBe('success');
    expect(subscriptionPlanStatusVariant('archived')).toBe('neutral');
  });
});
