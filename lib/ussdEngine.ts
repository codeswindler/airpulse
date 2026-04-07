import { prisma } from './prisma';

export async function processUssdRequest(sessionId: string, phoneNumber: string, inputRaw: string) {
  // Normalize input
  const input = normalizeInput(inputRaw);
  
  if (input === '00') {
    // Reset to main menu
    await prisma.ussdSession.update({
      where: { sessionId },
      data: { state: 'MAIN_MENU', targetPhone: null, amount: null }
    });
    return showMainMenu();
  }

  // Ensure User account/wallet exists & fetch balance
  const user = await prisma.user.upsert({
    where: { phoneNumber },
    update: {},
    create: { phoneNumber, walletBalance: 0.0 }
  });
  const walletBalance = user.walletBalance;

  // Find or create session
  let session = await prisma.ussdSession.findUnique({ where: { sessionId } });
  
  if (!session) {
    session = await prisma.ussdSession.create({
      data: {
        sessionId,
        phoneNumber,
        state: 'MAIN_MENU'
      }
    });
  }

  const { state } = session;

  if (state === 'MAIN_MENU') {
    if (input === '') {
      return showMainMenu();
    } else if (input === '1') {
      await updateSession(sessionId, { state: 'ENTER_AMOUNT_MY_NUMBER', targetPhone: phoneNumber });
      return `CON Enter your amount (Min:5, Max:5000)`;
    } else if (input === '2') {
      await updateSession(sessionId, { state: 'ENTER_OTHER_NUMBER' });
      return `CON Enter number you wish to receive amount`;
    } else if (input === '3') {
      const saved = await prisma.savedPhone.findMany({ where: { phoneNumber }, take: 5 });
      if (saved.length === 0) {
        return `CON You have no saved numbers.`;
      }
      let menu = 'CON Saved Numbers:\n';
      saved.forEach((s: any, idx: number) => {
        menu += `${idx + 1}. ${s.savedNumber}\n`;
      });
      await updateSession(sessionId, { state: 'SHOW_SAVED_NUMBERS' });
      return menu;
    } else if (input === '4') {
      return `END Goodbye.`;
    } else {
      return showMainMenu();
    }
  }

  if (state === 'ENTER_AMOUNT_MY_NUMBER' || state === 'ENTER_AMOUNT_OTHER_NUMBER' || state === 'ENTER_AMOUNT_SAVED_NUMBER') {
    const amount = parseFloat(input);
    if (isNaN(amount) || amount < 5 || amount > 5000) {
      return `CON Invalid amount. Enter your amount (Min:5, Max:5000)`;
    }
    await updateSession(sessionId, { amount, state: 'CONFIRM_PURCHASE' });
    
    let menu = `CON You about to buy Ksh. ${amount} airtime for ${session.targetPhone}.\n`;
    if (walletBalance >= amount) {
       menu += `1. Pay with Wallet (Bal: ${walletBalance})\n2. Pay with M-Pesa\n3. Cancel`;
    } else {
       menu += `1. Confirm M-Pesa\n2. Cancel`;
    }
    return menu;
  }

  if (state === 'ENTER_OTHER_NUMBER') {
    await updateSession(sessionId, { targetPhone: input, state: 'SAVE_NUMBER_PROMPT' });
    return `CON Do you want to save this number?\n1. Save number\n2. Proceed to purchase`;
  }

  if (state === 'SAVE_NUMBER_PROMPT') {
    if (input === '1' && session.targetPhone) {
      await prisma.savedPhone.upsert({
        where: { phoneNumber_savedNumber: { phoneNumber, savedNumber: session.targetPhone } },
        update: {},
        create: { phoneNumber, savedNumber: session.targetPhone }
      });
    }
    await updateSession(sessionId, { state: 'ENTER_AMOUNT_OTHER_NUMBER' });
    return `CON Enter your amount (Min:5, Max:5000)`;
  }

  if (state === 'SHOW_SAVED_NUMBERS') {
    const idx = parseInt(input) - 1;
    const saved = await prisma.savedPhone.findMany({ where: { phoneNumber }, take: 5 });
    if (isNaN(idx) || !saved[idx]) {
      return `CON Invalid selection.`;
    }
    await updateSession(sessionId, { targetPhone: saved[idx].savedNumber, state: 'ENTER_AMOUNT_SAVED_NUMBER' });
    return `CON Enter your amount (Min:5, Max:5000)`;
  }

  if (state === 'CONFIRM_PURCHASE') {
    const amount = session.amount || 0;
    const isWalletEligible = walletBalance >= amount;
    
    if (isWalletEligible) {
      if (input === '1') {
        triggerWalletPayment(phoneNumber, session.targetPhone!, amount, sessionId);
        return `END processing wallet payment... Ksh ${amount} charged.`;
      } else if (input === '2') {
        triggerStkPush(phoneNumber, session.targetPhone!, amount, sessionId);
        return `END processing M-Pesa... Please check your phone for the PIN prompt.`;
      }
    } else {
      if (input === '1') {
        triggerStkPush(phoneNumber, session.targetPhone!, amount, sessionId);
        return `END processing M-Pesa... Please check your phone for the PIN prompt.`;
      }
    }
    return `END Transaction cancelled.`;
  }

  return showMainMenu();
}

function showMainMenu() {
  return `CON Buy Credo Bila Charges!\n1. My Number\n2. Other number\n3. Saved Numbers\n4. Exit`;
}

function normalizeInput(inputStr?: string) {
  if (!inputStr) return "";
  let text = inputStr.trim().replace(/#$/, "");
  if (text.includes("*")) {
    const parts = text.split("*");
    text = parts[parts.length - 1];
  }
  return text.trim();
}

async function updateSession(sessionId: string, data: any) {
  await prisma.ussdSession.update({ where: { sessionId }, data });
}

function triggerStkPush(payerPhone: string, targetPhone: string, amount: number, sessionId: string) {
  fetch(`${process.env.APP_URL || 'http://localhost:3000'}/api/internal/stkpush`, {
    method: 'POST',
    body: JSON.stringify({ payerPhone, targetPhone, amount, sessionId }),
    headers: { 'Content-Type': 'application/json' }
  }).catch(console.error);
}

function triggerWalletPayment(payerPhone: string, targetPhone: string, amount: number, sessionId: string) {
  fetch(`${process.env.APP_URL || 'http://localhost:3000'}/api/internal/wallet-pay`, {
    method: 'POST',
    body: JSON.stringify({ payerPhone, targetPhone, amount, sessionId }),
    headers: { 'Content-Type': 'application/json' }
  }).catch(console.error);
}
