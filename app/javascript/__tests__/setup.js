// Jest setup file for Stimulus controller tests
import { Application } from "@hotwired/stimulus";

// Create a global Stimulus application for testing
global.Stimulus = Application.start();

// Mock DOM methods if needed
global.document = {
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  querySelector: jest.fn(),
  querySelectorAll: jest.fn()
};

global.window = {
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  location: { href: "" },
  localStorage: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn()
  }
};

