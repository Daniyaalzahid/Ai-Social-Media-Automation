import 'vitest';
import type { TestingLibraryMatchers } from '@testing-library/jest-dom/matchers';

// Use the supported standalone matcher API. jest-dom's /vitest entrypoint still
// augments the pre-Vitest-5 single-parameter Assertion interface.
declare module 'vitest' {
  interface Assertion<R extends void | Promise<void> = void, T = unknown> {
    toBeInTheDocument: TestingLibraryMatchers<T, R>['toBeInTheDocument'];
    toBeDisabled: TestingLibraryMatchers<T, R>['toBeDisabled'];
    toHaveAttribute: TestingLibraryMatchers<T, R>['toHaveAttribute'];
    toHaveClass: TestingLibraryMatchers<T, R>['toHaveClass'];
    toHaveTextContent: TestingLibraryMatchers<T, R>['toHaveTextContent'];
    toHaveAccessibleDescription: TestingLibraryMatchers<T, R>['toHaveAccessibleDescription'];
    toHaveValue: TestingLibraryMatchers<T, R>['toHaveValue'];
    toBeChecked: TestingLibraryMatchers<T, R>['toBeChecked'];
    toHaveFocus: TestingLibraryMatchers<T, R>['toHaveFocus'];
  }
}
