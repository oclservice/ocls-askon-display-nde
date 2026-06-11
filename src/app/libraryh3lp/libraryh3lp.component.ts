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
  chatAvailability = 'unavailable';
  chatOnline = false;
  hoverTooltip = false;
  mouseDown = false;
  showChat = false;

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

  useModuleParameter<K extends keyof this>(parameterName: K): void {
    const value = (this.moduleParams as Partial<Libraryh3lpComponent> | null)?.[
      parameterName as keyof Libraryh3lpComponent
    ];

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

    // Static data for testing
    this.queueName = "algonquin";
    this.snippetId = "1555";
    this.iconOnlineColor = "#D4DF38";
    //this.iconOfflineColor = "#454546";
    this.textOnlineColor = "#000000";
    //this.textOfflineColor = "#FFFFFF";
    this.server = "ca.libraryh3lp.com";
    this.offlineLink = "https://library.centennialcollege.ca/help-services/research-help/ask-the-library/";
    this.iconPosition = "20%";
    this.proactiveChat = false;
    this.proactiveDelay = 5;

    if (this.queueName) {
      this.checkAvailability();
      this.availabilityIntervalId = setInterval(this.checkAvailability, 5*1000);
    }

    if (this.snippetId) {
      this.loadSnippet(this.snippetId);
    }

    this.scheduleProactiveChat();
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
    if (!this.proactiveChat || this.showChat) {
      return;
    }

    const delaySeconds = Number(this.proactiveDelay ?? 0);
    const delayMs = Math.max(0, delaySeconds) * 1000;

    this.proactiveChatTimeoutId = setTimeout(() => {
      if (this.proactiveChat && !this.showChat) {
        this.toggleChatTab();
      }
    }, delayMs);
  }

  checkAvailability = () => {
    const url = `https://${this.server}/presence/jid/${this.queueName}/chat.${this.server}/js`;
    this.http
      .jsonp(url, 'cb')
      .subscribe({
        next: (_) => {
          this.zone.run(() => {
            for (let idx = 0; idx < jabber_resources.length; ++idx) {
              const resource = jabber_resources[idx];
              this.chatAvailability = resource.show;
              this.chatOnline = (this.chatAvailability === 'available' || this.chatAvailability === 'chat');
              // for testing
              //this.chatOnline = false;
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

  presenceDotUrl = () => `https://${this.server}/presence/image/flat-lang-neutral/${this.chatAvailability}`

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
}
