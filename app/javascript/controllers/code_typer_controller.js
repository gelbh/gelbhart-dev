import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["output"]
  
  connect() {
    // Multiple C code snippets to cycle through for infinite effect
    this.codeSnippets = [
      `#include <stdio.h>
#include <stdlib.h>
#include <string.h>

typedef struct Node {
    int data;
    struct Node* next;
} Node;

Node* createNode(int value) {
    Node* newNode = (Node*)malloc(sizeof(Node));
    if (newNode == NULL) {
        fprintf(stderr, "Memory allocation failed\\n");
        exit(1);
    }
    newNode->data = value;
    newNode->next = NULL;
    return newNode;
}

void insertNode(Node** head, int value) {
    Node* newNode = createNode(value);
    if (*head == NULL) {
        *head = newNode;
    } else {
        Node* temp = *head;
        while (temp->next != NULL) {
            temp = temp->next;
        }
        temp->next = newNode;
    }
}`,
      `int* quickSort(int arr[], int low, int high) {
    if (low < high) {
        int pivot = arr[high];
        int i = (low - 1);
        
        for (int j = low; j <= high - 1; j++) {
            if (arr[j] < pivot) {
                i++;
                int temp = arr[i];
                arr[i] = arr[j];
                arr[j] = temp;
            }
        }
        
        int temp = arr[i + 1];
        arr[i + 1] = arr[high];
        arr[high] = temp;
        int pi = i + 1;
        
        quickSort(arr, low, pi - 1);
        quickSort(arr, pi + 1, high);
    }
    return arr;
}

void traverseList(Node* head) {
    Node* current = head;
    while (current != NULL) {
        printf("%d -> ", current->data);
        current = current->next;
    }
    printf("NULL\\n");
}`,
      `void freeList(Node* head) {
    Node* temp;
    while (head != NULL) {
        temp = head;
        head = head->next;
        free(temp);
    }
}

int binarySearch(int arr[], int l, int r, int x) {
    if (r >= l) {
        int mid = l + (r - l) / 2;
        if (arr[mid] == x)
            return mid;
        if (arr[mid] > x)
            return binarySearch(arr, l, mid - 1, x);
        return binarySearch(arr, mid + 1, r, x);
    }
    return -1;
}

void swap(int* a, int* b) {
    int t = *a;
    *a = *b;
    *b = t;
}`
    ]
    
    this.currentSnippetIndex = 0
    this.currentIndex = 0
    this.typingSpeed = 35 // milliseconds per character (slower)
    this.maxLines = 25 // Keep approximately this many lines visible
    
    this.startTyping()
  }
  
  disconnect() {
    if (this.typingInterval) {
      clearInterval(this.typingInterval)
    }
  }
  
  startTyping() {
    this.outputTarget.innerHTML = '<span class="typing-cursor"></span>'
    
    this.typingInterval = setInterval(() => {
      const currentSnippet = this.codeSnippets[this.currentSnippetIndex]
      
      if (this.currentIndex < currentSnippet.length) {
        const char = currentSnippet[this.currentIndex]
        const textNode = document.createTextNode(char)
        
        // Insert text before cursor
        const cursor = this.outputTarget.querySelector('.typing-cursor')
        this.outputTarget.insertBefore(textNode, cursor)
        
        this.currentIndex++
        
        // Remove old lines to keep it looking infinite
        this.trimOldLines()
      } else {
        // Finished current snippet, seamlessly move to next
        this.currentSnippetIndex = (this.currentSnippetIndex + 1) % this.codeSnippets.length
        this.currentIndex = 0
        
        // Add some newlines for separation
        const separator = document.createTextNode('\n\n')
        const cursor = this.outputTarget.querySelector('.typing-cursor')
        this.outputTarget.insertBefore(separator, cursor)
        
        this.trimOldLines()
      }
    }, this.typingSpeed)
  }
  
  trimOldLines() {
    // Keep the display to about maxLines by removing old content
    const text = this.outputTarget.textContent.replace('█', '') // Remove cursor from count
    const lines = text.split('\n')
    
    if (lines.length > this.maxLines) {
      // Remove oldest lines
      const linesToRemove = lines.length - this.maxLines
      let charsToRemove = 0
      
      for (let i = 0; i < linesToRemove; i++) {
        charsToRemove += lines[i].length + 1 // +1 for newline
      }
      
      // Remove nodes from beginning
      let removed = 0
      while (removed < charsToRemove && this.outputTarget.childNodes.length > 1) {
        const firstNode = this.outputTarget.childNodes[0]
        if (firstNode.nodeType === Node.TEXT_NODE) {
          removed += firstNode.textContent.length
        }
        this.outputTarget.removeChild(firstNode)
      }
    }
  }
}
