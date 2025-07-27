import { CommonModule } from '@angular/common';
import { Component, ViewChild, ElementRef, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { log } from 'node:console';

interface Message {
  type: 'user' | 'bot';
  content: string;
}

interface Message {
  type: 'user' | 'bot';
  content: string;
  isStreaming?: boolean;
}

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrls: ['./app.css'],
  standalone: true,
  imports: [CommonModule, FormsModule],
})
export class AppComponent implements AfterViewInit {
  @ViewChild('chatMessages') chatMessages!: ElementRef;

  messages: Message[] = [];
  userMessage: string = '';
  isTyping: boolean = false;
  
  // API Configuration
  private apiUrl = 'http://localhost:8080/api/chat?message='; // Replace with your API endpoint
  private currentBotMessage: Message | null = null;

  constructor(private cdr: ChangeDetectorRef) {}

  // Predefined responses for demo
  private responses: { [key: string]: string } = {
    'hello': 'Hello! Great to meet you! 👋 How can I assist you today?',
    'hi': 'Hi there! 😊 What can I help you with?',
    'how are you': 'I\'m doing fantastic, thank you for asking! 🌟 How are you doing today?',
    'what can you do': 'I can help you with various tasks including:\n• Answering questions\n• Providing information\n• Having conversations\n• Solving problems\n• And much more! 🚀',
    'tell me a joke': 'Why don\'t scientists trust atoms? Because they make up everything! 😄',
    'bye': 'Goodbye! It was great chatting with you. Have a wonderful day! 👋',
    'goodbye': 'Goodbye! It was great chatting with you. Have a wonderful day! 👋',
    'thank you': 'You\'re very welcome! I\'m always here to help. 😊',
    'thanks': 'My pleasure! Feel free to ask if you need anything else. ✨',
    'help': 'I\'m here to help! You can ask me questions, request information, or just have a conversation. What would you like to know? 🤔',
    'default': 'That\'s interesting! I\'m still learning and growing. Could you tell me more about that? 🤔'
  };

  ngAfterViewInit() {
    // Initial scroll to bottom
    setTimeout(() => {
      this.scrollToBottom();
    }, 500);
  }

  sendMessage(): void {
    if (!this.userMessage.trim()) return;

    // Add user message
    this.messages.push({
      type: 'user',
      content: this.userMessage
    });

    const userInput = this.userMessage;
    this.userMessage = '';
    this.isTyping = true;

    // Scroll to bottom
    setTimeout(() => {
      this.scrollToBottom();
    }, 100);

    // Call streaming API
    this.fetchStreamingResponse(userInput);
  }

  private async fetchStreamingResponse(payload: any): Promise<void> {
    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: payload }) // Ensure payload is sent as JSON
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response body reader available');
      }

      // Initialize a new bot message for streaming
      this.currentBotMessage = {
        type: 'bot',
        content: '',
        isStreaming: true
      };
      this.messages.push(this.currentBotMessage);

      // Process streaming chunks
      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          if (this.currentBotMessage) {
            this.currentBotMessage.isStreaming = false;
          }
          this.isTyping = false; // Ensure typing indicator is hidden
          break;
        }

        const chunk = decoder.decode(value, { stream: true });

        // Check for special messages
        console.log('Received chunk:', chunk);
        if (chunk.includes('[DONE]')) {
          console.log(this.isTyping);
          break;
        } else if (chunk.includes('[ERROR]')) {
          this.handleStreamingError();
          break;
        }

        this.appendToCurrentMessage(chunk); // Append the streamed chunk to the bot's message
      }
    } catch (error) {
      console.error('Streaming error:', error);
      this.handleStreamingError();
    } finally {
      this.isTyping = false; // Ensure typing is reset
      if (this.currentBotMessage) {
        this.currentBotMessage.isStreaming = false; // Ensure loading stops if not already set
      }
      this.cdr.detectChanges();
      this.scrollToBottom();
    }
    console.log(this.isTyping);
  }

  private appendToCurrentMessage(content: string): void {
    if (this.currentBotMessage) {
      this.currentBotMessage.content += content;
      this.cdr.detectChanges(); // Trigger change detection

      // Scroll to bottom as content is added
      setTimeout(() => {
        this.scrollToBottom();
      }, 10);
    }
  }

  private handleStreamingError(): void {
    if (this.currentBotMessage) {
      this.currentBotMessage.content = 'Sorry, I encountered an error while processing your request. Please try again.';
      this.currentBotMessage.isStreaming = false;
    } else {
      this.messages.push({
        type: 'bot',
        content: 'Sorry, I encountered an error while processing your request. Please try again.',
        isStreaming: false
      });
    }
    this.scrollToBottom();
  }

  sendQuickMessage(message: string): void {
    this.userMessage = message;
    this.sendMessage();
  }

  private scrollToBottom(): void {
    try {
      this.chatMessages.nativeElement.scrollTop = this.chatMessages.nativeElement.scrollHeight;
    } catch (err) {
      console.error('Error scrolling to bottom:', err);
    }
  }
}