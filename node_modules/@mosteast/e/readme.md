# Better error

## Project Information
- Main problem this package solves: Make errors easier to extend, structure.
- Main language: Typescript.

## Getting started

```typescript
class My_error extends E {
  message = 'Default message'
  eid = 'E123'

  constructor(...argS) {
    super()
    this.init(...argS)
  }
}

// Use default message
throw new My_error() // My_error: Default message

// Custom message
throw new My_error('Invalid configuration') // My_error: Invalid configuration

// Error message with solution
throw new My_error('Invalid configuration', 'Configure .env file first') // My_error: Invalid  configuration

// Error with more information
throw new My_error({
  message: 'Invalid configuration',
  solution: 'Configure .env file first',
  eid: 'E456',
  level: 'internal'
})
```

```bash
npm i # Install.
npm t # Run test first.
npm start # Start development.
``` 

### {Can do this}

{Example}

### {Can do that}

{Example}


