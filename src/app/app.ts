import {
  AfterViewInit,
  CUSTOM_ELEMENTS_SCHEMA,
  Component,
  ElementRef,
  ViewChild,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  ButtonComponent,
  DropdownSimpleComponent,
  DropdownSimpleItem,
  HeaderComponent,
  PasswordInputComponent,
  TextInputComponent,
} from '@bpifrance/propulsion';
import { JiraBoard } from './jira-board/jira-board';

interface LogEntry {
  time: string;
  kind: string;
  detail: string;
}

@Component({
  selector: 'app-root',
  imports: [
    FormsModule,
    HeaderComponent,
    ButtonComponent,
    TextInputComponent,
    PasswordInputComponent,
    DropdownSimpleComponent,
    JiraBoard,
  ],
  // <agent-registry> / <mini-chatbot> are external custom elements (Web Components).
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class App implements AfterViewInit {
  @ViewChild('reg') private regRef!: ElementRef<HTMLElement & Record<string, unknown>>;

  protected readonly modeItems: DropdownSimpleItem[] = [
    new DropdownSimpleItem('mock', 'Mock hors-ligne (données de démonstration)', 'mock'),
    new DropdownSimpleItem('http', 'API réelle (agent-registry)', 'http'),
  ];

  // Mock by default: no agent-registry backend is bundled in this workspace,
  // so "API réelle" would fail with ERR_CONNECTION_REFUSED until a real API is running.
  protected readonly activeTab = signal<'registry' | 'jira'>('registry');

  protected mode = 'mock';
  protected heading = 'agent-registry';
  protected baseUrl = 'http://localhost:8000';
  protected apiKey = 'local-dev-key';
  protected readonly modeBadge = signal('mode : mock');
  protected readonly logs = signal<LogEntry[]>([]);

  ngAfterViewInit(): void {
    const reg = this.regRef.nativeElement;

    // Criterion 9: the API key is supplied through a function invoked on open,
    // NOT via an attribute.
    (reg as { apiKeyProvider?: () => string }).apiKeyProvider = () => {
      this.log('apiKeyProvider()', `clé fournie à l'ouverture (${this.apiKey ? this.apiKey.length + ' caractères' : 'vide'})`);
      return this.apiKey;
    };

    ['open', 'close', 'agent-selected', 'object-loaded', 'error'].forEach((name) => {
      reg.addEventListener(`agent-registry:${name}`, (event) => {
        const detail = (event as CustomEvent).detail ?? {};
        const extra = detail.agent
          ? `→ ${detail.agent.display_name || detail.agent.id}`
          : detail.key
            ? `→ ${detail.key}`
            : detail.error
              ? `→ ${detail.error.message || detail.error}`
              : '';
        this.log(`event:${name}`, extra);
      });
    });

    // Sync the element's attributes with the component's initial state
    // (the template's static attributes would otherwise force "API réelle").
    this.applyConfig();
    this.log('ready', 'composant chargé');
  }

  protected onModeChange(): void {
    this.applyConfig();
    this.log('config', `mode = ${this.mode}`);
  }

  protected onApplyOpen(): void {
    this.applyConfig();
    (this.regRef.nativeElement as { open?: () => void }).open?.();
  }

  protected onClose(): void {
    (this.regRef.nativeElement as { close?: () => void }).close?.();
  }

  private applyConfig(): void {
    const reg = this.regRef.nativeElement;
    reg.setAttribute('heading', this.heading || 'agent-registry');
    if (this.mode === 'http') {
      reg.removeAttribute('mock');
      reg.setAttribute('base-url', this.baseUrl.trim());
      this.modeBadge.set('mode : API réelle');
    } else {
      reg.removeAttribute('base-url');
      reg.setAttribute('mock', '');
      this.modeBadge.set('mode : mock');
    }
    const withReload = reg as { reload?: () => void; _client?: unknown };
    if (withReload.reload && withReload._client) withReload.reload();
  }

  private log(kind: string, detail: string): void {
    const time = new Date().toLocaleTimeString('fr-FR');
    this.logs.update((entries) => [...entries, { time, kind, detail }]);
  }
}
