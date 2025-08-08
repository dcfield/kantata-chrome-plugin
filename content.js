function clickToggleUserButtons() {
  const buttons = document.querySelectorAll('button[aria-label="Toggle User"][title="Toggle User"]');
  
  if (buttons.length === 0) {
    console.error("No buttons with aria-label='Toggle User' and title='Toggle User' found.");
    return;
  }

  buttons.forEach(button => {
    button.click();
    console.log("Button with aria-label='Toggle User' clicked.");
  });
}
