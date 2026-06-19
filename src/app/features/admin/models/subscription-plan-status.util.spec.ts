import {
  subscriptionPlanApiStatusFilterToTab,
  subscriptionPlanStatusBadgeClass,
  subscriptionPlanStatusFilterToApiValue,
  subscriptionPlanStatusLabel,
  subscriptionPlanTabToApiStatusFilter
} from './subscription-plan-status.util';

describe('subscription-plan-status.util', () => {
  it('maps backend status values to UI labels', () => {
    expect(subscriptionPlanStatusLabel('draft')).toBe('Draft');
    expect(subscriptionPlanStatusLabel('active')).toBe('Published');
    expect(subscriptionPlanStatusLabel('retired')).toBe('Archived');
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
  });

  it('maps badge classes from backend status values', () => {
    expect(subscriptionPlanStatusBadgeClass('active')).toBe('published');
    expect(subscriptionPlanStatusBadgeClass('retired')).toBe('archived');
    expect(subscriptionPlanStatusBadgeClass('draft')).toBe('draft');
  });
});
