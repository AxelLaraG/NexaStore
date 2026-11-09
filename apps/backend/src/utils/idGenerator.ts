let counter = 10;

export function generateCalculateID():string{
    const now = new Date();
    const yyyy = now.getFullYear().toString();
    const mm = String(now.getMonth() + 1).padStart(2,'0');
    const dd = String(now.getDate()).padStart(2,'0');
    const hh = String(now.getHours()).padStart(2,'0');
    const min = String(now.getMinutes()).padStart(2,'0');
    const ss = String(now.getSeconds()).padStart(2,'0');

    counter = counter >= 99 ? 10 : counter + 1;
    
    return `${yyyy}${mm}${dd}${hh}${min}${ss}`;
}