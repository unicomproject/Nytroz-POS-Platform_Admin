import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { PageHeader } from './page-header';

describe('PageHeader', () => {
  let fixture: ComponentFixture<PageHeader>;
  let component: PageHeader;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PageHeader],
      providers: [provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(PageHeader);
    component = fixture.componentInstance;
  });

  it('renders title and default eyebrow text', () => {
    fixture.componentRef.setInput('title', 'Test Page Title');
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toBe('Test Page Title');
    expect(compiled.querySelector('.eyebrow')?.textContent).toBe('Platform Admin');
  });

  it('renders custom description/subtitle when supplied', () => {
    fixture.componentRef.setInput('title', 'Page Title');
    fixture.componentRef.setInput('description', 'This is a test description');
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.description')?.textContent).toBe('This is a test description');
  });

  it('renders breadcrumbs and ignores eyebrow when breadcrumbs are supplied', () => {
    fixture.componentRef.setInput('title', 'Dashboard');
    fixture.componentRef.setInput('breadcrumbs', [
      { label: 'Admin', path: '/admin' },
      { label: 'Dashboard' }
    ]);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.eyebrow')).toBeNull();
    
    const breadcrumbLinks = compiled.querySelectorAll('.breadcrumbs a');
    expect(breadcrumbLinks.length).toBe(1);
    expect(breadcrumbLinks[0].textContent).toBe('Admin');
    expect(breadcrumbLinks[0].getAttribute('href')).toBe('/admin');

    const currentCrumb = compiled.querySelector('.crumb-current');
    expect(currentCrumb?.textContent).toBe('Dashboard');
  });
});
