/**
 * Charity-Flohmarkt Luckenwalde - Cloud Sync Logic
 * This file handles only the Supabase connection and donation pot synchronization.
 */

// ############################################################
// SUPABASE CONFIGURATION
const SUPABASE_URL = 'https://mgpspiiahhiyvwdnvxzf.supabase.co';
const SUPABASE_KEY = 'sb_publishable_yiXxbpIqxagjGPnnI7B4Jw__9oZoh_O';
let supabase;

try {
    if (window.supabase) {
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    }
} catch (e) {
    console.error("Supabase Initialization Error:", e);
}
// ############################################################

// --- Global State ---
const LOCAL_STORAGE_KEY = 'charity-flohmarkt-pot-v2';
let potTotal = 0;
let currentDonation = 0;
const MAX_DONATION = 1000;

// --- DOM Elements ---
let potTotalElement, currentAmountElement, potContainer, potWrapper, messageElement, cloudStatus;

function initCloudElements() {
    potTotalElement = document.getElementById('potTotal');
    currentAmountElement = document.getElementById('currentAmount');
    potContainer = document.getElementById('potContainer');
    potWrapper = document.getElementById('potWrapper');
    messageElement = document.getElementById('donationMessage');
    cloudStatus = document.getElementById('cloudStatus');
}

// --- Donation Logic ---
async function syncPot() {
    if (!supabase) return;
    try {
        const { data, error } = await supabase
            .from('spenden')
            .select('betrag')
            .eq('id', 1)
            .single();

        if (data) {
            const cloudValue = parseFloat(data.betrag) || 0;
            if (cloudValue > potTotal) {
                potTotal = cloudValue;
                animatePotUpdate();
            }
            if (cloudStatus) {
                cloudStatus.innerText = '☁ Supabase Aktiv (Verbunden)';
                cloudStatus.style.color = 'white';
            }
        } else if (error && cloudStatus) {
            cloudStatus.innerText = '☁ Lokal-Modus (Fehler)';
            cloudStatus.style.color = 'rgba(255,255,255,0.5)';
        }
    } catch (e) {
        if (cloudStatus) cloudStatus.innerText = '☁ Verbindungsproblem';
    }
}

async function pushToCloud(val) {
    if (!supabase) return;
    try {
        await supabase
            .from('spenden')
            .update({ betrag: val })
            .eq('id', 1);
    } catch (e) { 
        console.log("Cloud-Update fehlgeschlagen"); 
    }
}

function addAmount(amount) {
    if (currentDonation + amount <= MAX_DONATION) {
        currentDonation += amount;
        updateDisplay();
        if (typeof clearMessage === 'function') clearMessage();
    } else {
        if (typeof showMessage === 'function') showMessage('Maximaler Betrag pro Vorgang sind 1000 €!', 'red');
    }
}

function resetAmount() {
    currentDonation = 0;
    updateDisplay();
    if (typeof clearMessage === 'function') clearMessage();
}

function updateDisplay() {
    if (potTotalElement) potTotalElement.innerText = potTotal.toFixed(2).replace('.', ',') + ' €';
    if (currentAmountElement) currentAmountElement.innerText = currentDonation.toFixed(2).replace('.', ',') + ' €';
}

function createCoins() {
    if (!potWrapper) return;
    for (let i = 0; i < 5; i++) {
        setTimeout(() => {
            const coin = document.createElement('div');
            coin.className = 'coin';
            coin.style.left = (30 + Math.random() * 40) + '%';
            coin.style.animation = 'coinDrop 1s ease-in forwards';
            potWrapper.appendChild(coin);
            setTimeout(() => { coin.remove(); }, 1000);
        }, i * 150);
    }
}

function animatePotUpdate() {
    if (!potTotalElement || !potContainer) return;
    potTotalElement.innerText = potTotal.toFixed(2).replace('.', ',') + ' €';
    potContainer.style.animation = 'none';
    potContainer.offsetHeight; // force reflow
    potContainer.style.animation = 'fillPotAnim 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
    setTimeout(() => {
        potContainer.style.animation = 'float-pot 6s ease-in-out infinite';
    }, 600);
}

async function sendDonation() {
    if (currentDonation > 0) {
        createCoins();
        setTimeout(async () => {
            if (supabase) {
                const { data: currentData } = await supabase.from('spenden').select('betrag').eq('id', 1).single();
                const neuerGesamtstand = (parseFloat(currentData?.betrag) || 0) + currentDonation;
                potTotal = neuerGesamtstand;
                await pushToCloud(potTotal);
            } else {
                potTotal += currentDonation;
            }
            
            localStorage.setItem(LOCAL_STORAGE_KEY, potTotal);
            animatePotUpdate();
            currentDonation = 0;
            updateDisplay();
            if (typeof showMessage === 'function') showMessage('Vielen Dank für deine großzügige Spende! ✿', 'var(--accent-teal)');

            setTimeout(() => {
                if (messageElement && messageElement.innerText.includes('Vielen Dank')) {
                    if (typeof clearMessage === 'function') clearMessage();
                }
            }, 4000);
        }, 800);
    } else {
        if (typeof showMessage === 'function') showMessage('Bitte wähle zuerst einen Betrag aus!', 'red');
    }
}

// Helper functions (if not in HTML)
function showMessage(msg, color) {
    if (messageElement) {
        messageElement.innerText = msg;
        messageElement.style.color = color;
    }
}
function clearMessage() {
    if (messageElement) messageElement.innerText = '';
}

// --- Initialization ---
window.addEventListener('DOMContentLoaded', () => {
    initCloudElements();

    const local = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (local) {
        potTotal = parseFloat(local);
        updateDisplay();
    }

    syncPot();
    setInterval(syncPot, 10000);
});
