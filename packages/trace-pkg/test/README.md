trace-pkg Tests
===============

Here's a quick guide to our various test directories:

- `e2e`: Tests the entire application at the CLI level using the **real** file system. Expected to be slower than all other tests.
- `bin`: Tests the entire application at the CLI level using a mocked in-memory file system.
- `lib`, `util`: Unit tests of specific library code using a mocked file system.
