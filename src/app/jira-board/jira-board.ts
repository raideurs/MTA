import { Component, OnInit, signal } from '@angular/core';
import { ButtonComponent } from '@bpifrance/propulsion';

interface JiraCard {
  key: string;
  summary: string;
  type: string;
  priority: string;
  assignee: string | null;
  status: string;
}

interface JiraColumn {
  name: string;
  issues: JiraCard[];
}

interface JiraKanban {
  boardName: string;
  columns: JiraColumn[];
}

const PROXY_URL = 'http://localhost:4002';
const BOARD_ID = '1729';

@Component({
  selector: 'app-jira-board',
  imports: [ButtonComponent],
  styleUrl: './jira-board.scss',
  templateUrl: './jira-board.html',
})
export class JiraBoard implements OnInit {
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly board = signal<JiraKanban | null>(null);

  ngOnInit(): void {
    this.load();
  }

  protected async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const res = await fetch(`${PROXY_URL}/api/jira/kanban/${BOARD_ID}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || `Erreur ${res.status}`);
      }
      this.board.set(await res.json());
    } catch (err) {
      this.error.set(
        `Impossible de charger le tableau Jira. Vérifiez que le proxy local tourne (server/jira-proxy.mjs) et que JIRA_TOKEN est configuré. Détail : ${(err as Error).message}`
      );
    } finally {
      this.loading.set(false);
    }
  }
}
