# Example Bundle

A complete example bundle for NodeCG Next demonstrating core features and best practices.

## Features

- **Extension**: Server-side logic with replicant management
- **Lower Third Graphic**: Animated on-screen graphic with smooth transitions
- **Control Panel**: Dashboard interface for managing the graphic
- **Asset Management**: Support for image uploads
- **State Persistence**: Replicants persist across server restarts
- **Real-time Updates**: Changes sync instantly between dashboard and graphics

## Structure

```
example-bundle/
├── package.json          # Bundle configuration
├── extension/
│   └── index.js          # Server-side extension
├── graphics/
│   └── lower-third.html  # Broadcast graphic
└── dashboard/
    └── control.html      # Control panel
```

## Replicants

The bundle uses four replicants for state management:

- **currentName** (String): Person's name to display
- **currentTitle** (String): Person's job title
- **isVisible** (Boolean): Whether the lower third is visible
- **messageLog** (Array): Log of recent changes

## Usage

### Dashboard

1. Open the control panel from the NodeCG dashboard
2. Enter a name and title
3. Click "Update" to save changes
4. Click "Show" to display the lower third
5. Click "Hide" to hide it
6. Use presets for quick changes

### Graphic

1. Add the lower third graphic to your broadcast software (OBS, vMix, etc.)
2. Set the browser source dimensions to 1920x1080
3. The graphic will automatically update when you make changes in the dashboard
4. Smooth slide-in/slide-out animations are built-in

## Development

This bundle uses vanilla JavaScript for maximum compatibility. No build process is required.

### Adding Features

1. **New Replicant**: Add in `extension/index.js`
   ```javascript
   const myReplicant = nodecg.Replicant('myReplicant', {
     defaultValue: 'initial value',
     persistent: true,
   });
   ```

2. **Listen for Changes**: In extension or graphics
   ```javascript
   myReplicant.on('change', (newValue, oldValue) => {
     console.log('Value changed:', newValue);
   });
   ```

3. **Update from Dashboard**: In control panel
   ```javascript
   const myReplicant = nodecg.Replicant('myReplicant');
   myReplicant.value = 'new value';
   ```

## Testing

Open the graphic directly in a browser to test in demo mode:
```
file:///path/to/bundles/example-bundle/graphics/lower-third.html
```

The graphic includes a demo mode that cycles through visibility and sample values.

## Customization

### Styling

Edit the `<style>` section in `graphics/lower-third.html`:

- **Colors**: Change the gradient in `.lower-third` background
- **Animation**: Modify the `transition` property
- **Fonts**: Update `font-family` declarations
- **Position**: Adjust `bottom` and `left` values

### Logic

Edit `extension/index.js` to add:

- Custom validation
- Integration with external APIs
- Automated updates
- Complex state management

## Production Use

For production, the NodeCG client will automatically replace the mock API:

```javascript
// Development (mock)
const nodecg = window.nodecg || { /* mock */ };

// Production (actual NodeCG client)
const nodecg = window.nodecg; // Provided by NodeCG
```

## License

MIT
