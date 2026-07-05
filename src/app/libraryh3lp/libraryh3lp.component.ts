import { CdkDrag } from '@angular/cdk/drag-drop';
import {
  Component,
  ElementRef,
  HostListener,
  Inject,
  NgZone,
  Optional,
  OnInit
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { AssetsPublicPathDirective } from '../services/assets-public-path.directive';

declare var jabber_resources: any;

@Component({
  selector: 'custom-libraryh3lp',
  standalone: true,
  imports: [CdkDrag, CommonModule, AssetsPublicPathDirective],
  templateUrl: './libraryh3lp.component.html',
  styleUrl: './libraryh3lp.component.scss'
})
export class Libraryh3lpComponent implements OnInit {
  // Internal recordkeeping
  availabilityIntervalId?: ReturnType<typeof setInterval>;
  proactiveChatTimeoutId?: ReturnType<typeof setTimeout>;
  chatOnline = false;
  proactiveChatOnline = false;
  hoverTooltip = false;
  mouseDown = false;
  showChat = false;
  showProactiveChat = false;

  // Chat parameters
  queueName?: string;
  server = 'libraryh3lp.com';
  snippetId?: string;

  // Optional customizations
  offlineLink?: string;
  iconOfflineColor?: string;
  iconOnlineColor?: string;
  textOfflineColor?: string;
  textOnlineColor?: string;
  iconPosition?: string;
  proactiveChat = false;
  proactiveDelay?: number;
  snippetIdProactive?: string;
  queueNameProactive?: string;
  forceOnline = false;

  constructor(
    private elRef: ElementRef,
    private http: HttpClient,
    @Optional() @Inject('MODULE_PARAMETERS')
    private moduleParams: Partial<Libraryh3lpComponent> | null, // type the injected params
    private zone: NgZone
  ) {
    console.log('libraryh3lp (askON): constructor');
  }

  setParam<K extends keyof this>(key: K, value: this[K]) {
    this[key] = value;
  }

  private normalizeBoolean(value: unknown, fallback = false): boolean {
    if (typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();

      if (normalized === 'true') {
        return true;
      }

      if (normalized === 'false') {
        return false;
      }
    }

    return fallback;
  }

  private normalizeNumber(value: unknown, fallback = 0): number {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === 'string') {
      const parsed = Number(value.trim());
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }

    return fallback;
  }

  useModuleParameter<K extends keyof this>(parameterName: K): void {
    let value = (this.moduleParams as Partial<Libraryh3lpComponent> | null)?.[
      parameterName as keyof Libraryh3lpComponent
    ] as unknown;

    if (parameterName === 'proactiveChat') {
      value = this.normalizeBoolean(value, false);
    }

    if (parameterName === 'proactiveDelay') {
      value = this.normalizeNumber(value, 0);
    }

    if (value !== undefined) {
      this.setParam(parameterName, value as this[K]);
    }
  }

  ngOnInit() {
    console.log('libraryh3lp (askON): ngOnInit');

    // Chat basics
    this.useModuleParameter('server');
    this.useModuleParameter('queueName');
    this.useModuleParameter('snippetId');

    // Look & feel customizations
    this.useModuleParameter('offlineLink');
    this.useModuleParameter('iconOfflineColor');
    this.useModuleParameter('iconOnlineColor');
    this.useModuleParameter('textOfflineColor');
    this.useModuleParameter('textOnlineColor');
    this.useModuleParameter('iconPosition');
    this.useModuleParameter('proactiveChat');
    this.useModuleParameter('proactiveDelay');
    this.useModuleParameter('snippetIdProactive');
    this.useModuleParameter('queueNameProactive');
    this.useModuleParameter('forceOnline');

    if (this.queueName) {
      this.checkAvailability(this.queueName, (online) => this.chatOnline = online);
      this.availabilityIntervalId = setInterval(() => this.checkAvailability(this.queueName!, (online) => this.chatOnline = online), 5*1000);
    }

    if (this.snippetId) {
      this.loadSnippet(this.snippetId);
    }

    if (this.proactiveChat && this.queueNameProactive && this.snippetIdProactive) {
      this.loadSnippet(this.snippetIdProactive);
      this.checkAvailability(this.queueNameProactive, (online) => this.proactiveChatOnline = online); 
      this.scheduleProactiveChat();
    }

  }

  ngOnDestroy() {
    console.log('libraryh3lp: ngOnDestroy');

    if (this.availabilityIntervalId) {
      clearInterval(this.availabilityIntervalId);
    }

    if (this.proactiveChatTimeoutId) {
      clearTimeout(this.proactiveChatTimeoutId);
    }
  }

  scheduleProactiveChat() {
    if (!this.proactiveChat || this.showProactiveChat || !this.proactiveChatOnline) {
      return;
    }

    const delaySeconds = Number(this.proactiveDelay ?? 0);
    const delayMs = Math.max(0, delaySeconds) * 1000;

    this.proactiveChatTimeoutId = setTimeout(() => {
      if (this.proactiveChat) {
        console.log('libraryh3lp (askON): proactive chat triggered');
        this.toggleProactiveChatTab();
      }
    }, delayMs);
  }

  checkAvailability = (queueName: string, onResult: (online: boolean) => void) => {
    if (this.forceOnline) {
      onResult(true);
      console.log(`libraryh3lp (askON): checkAvailability for queue ${queueName} forced to available (test mode)`);
      return;
    }

    const url = `https://${this.server}/presence/jid/${queueName}/chat.${this.server}/js`;
    this.http
      .jsonp(url, 'cb')
      .subscribe({
        next: (_) => {
          this.zone.run(() => {
            for (let idx = 0; idx < jabber_resources.length; ++idx) {
              const availability = jabber_resources[idx].show;
              onResult(availability === 'available' || availability === 'chat');
              console.log(`libraryh3lp (askON): checkAvailability for queue ${queueName} returned ${availability}`);
            }
          });
        },
        error: (_) => {
          if (this.availabilityIntervalId) {
            clearInterval(this.availabilityIntervalId);
          }
        },
      });
  }

  @HostListener('document:click', ['$event'])
  handleClickOutside(event: MouseEvent) {
    const clickedInside = this.elRef.nativeElement.contains(event.target);
    if (!clickedInside && this.showChat) {
      this.toggleChatTab(event);
    }
    const proactiveFrame = this.elRef.nativeElement.querySelector('.lh3-proactive-chat-frame-wrap');
    if (this.showProactiveChat && !proactiveFrame?.contains(event.target as Node)) {
      this.showProactiveChat = false;
    }
  }

  @HostListener('document:keydown.escape', ['$event'])
  handleEscape(event: Event) {
    if (this.showChat && !this.chatOnline) {
      this.toggleChatTab(event);
    }
  }

  loadSnippet(id?: string): void {
    if (!id) {
      return;
    }

    const src = `https://${this.server}/js/libraryh3lp.js?${id}`;

    // Check if script is already loaded
    if (document.querySelector(`script[src="${src}"]`)) {
      return;
    }

    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    document.body.appendChild(script);
  }

  loadProactiveChat(): void {
    console.log('libraryh3lp (askON): loadProactiveChat');
    window.open(`https://${this.server}/chat/${this.queueNameProactive}@chat.${this.server}?skin=16499`, 'askON Tell Us!', 'width=400,height=600,noopener,noreferrer');
    this.toggleProactiveChatTab();
  }

  mouseOverChatTab = () => {
    this.hoverTooltip = (this.chatOnline && !this.showChat) ? true : false;
    return false;
  };
  mouseOutChatTab = () => {
    this.hoverTooltip = false;
    return false;
  };

  tabColor = () =>
    this.chatOnline
      ? (this.iconOnlineColor || 'var(--sys-primary)')
      : (this.iconOfflineColor || 'var(--sys-surface-dim)');

  textColor = () =>
    this.chatOnline
      ? (this.textOnlineColor || 'var(--sys-on-primary)')
      : (this.textOfflineColor || 'var(--sys-on-surface)');

  openOfflineLink = (event: Event) => {
    event.preventDefault();
    event.stopPropagation();

    if (this.offlineLink) {
      window.open(this.offlineLink, '_blank', 'noopener,noreferrer');
    }

    return false;
  };

  toggleChatTab = (event?: Event) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    } else if (this.showChat) {
      // Clicked a toggle somewhere from page, but chat is already open.
      return false;
    }

    this.hoverTooltip = false;
    this.showChat = !this.showChat;

    return false;
  };

  toggleProactiveChatTab = (event?: Event) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    } else if (this.showChat) {
      // Clicked a toggle somewhere from page, but chat is already open.
      return false;
    }

    this.hoverTooltip = false;
    this.showProactiveChat = !this.showProactiveChat;

    return false;
  };

}
