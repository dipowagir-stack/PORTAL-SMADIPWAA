export function generateSchedule(loads: any[], teachers: any[], daysPerWeek: number, periodsPerDay: number) {
  daysPerWeek = Number(daysPerWeek);
  periodsPerDay = Number(periodsPerDay);
  if (isNaN(daysPerWeek) || daysPerWeek <= 0) daysPerWeek = 5;
  if (isNaN(periodsPerDay) || periodsPerDay <= 0) periodsPerDay = 8;

  const schedule: any[] = [];
  const classTimetable: any = {};
  const teacherTimetable: any = {};

  for (const load of loads) {
    if (!classTimetable[load.className]) {
      classTimetable[load.className] = Array(daysPerWeek).fill(null).map(() => Array(periodsPerDay).fill(false));
    }
    if (!teacherTimetable[load.teacherId]) {
      teacherTimetable[load.teacherId] = Array(daysPerWeek).fill(null).map(() => Array(periodsPerDay).fill(false));
    }
  }

  teachers.forEach(t => {
    if (t.timeOff && teacherTimetable[t.uid]) {
      t.timeOff.forEach((to: string) => {
        const [d, p] = to.split('-').map(Number);
        if (d < daysPerWeek && p < periodsPerDay) {
          teacherTimetable[t.uid][d][p] = true;
        }
      });
    }
  });

  const blocks: any[] = [];
  loads.forEach(load => {
    let remaining = Number(load.hours);
    while (remaining > 0) {
      let blockSize = remaining;
      // Memaksa blok tidak lebih besar dari 3
      if (remaining > 3) {
        blockSize = remaining % 2 === 0 ? 2 : (remaining % 3 === 0 ? 3 : 2);
      }
      blocks.push({ ...load, blockSize, blockId: Math.random().toString(36).substr(2, 9) });
      remaining -= blockSize;
    }
  });

  // Sort blocks: largest blocks first, then prioritize subjects with tight constraints (like PE)
  blocks.sort((a, b) => {
    if (a.blockSize !== b.blockSize) return b.blockSize - a.blockSize;
    const aIsPE = a.subject.toLowerCase().includes('penjas') || a.subject.toLowerCase().includes('olahraga');
    const bIsPE = b.subject.toLowerCase().includes('penjas') || b.subject.toLowerCase().includes('olahraga');
    if (aIsPE && !bIsPE) return -1;
    if (!aIsPE && bIsPE) return 1;
    return 0;
  });

  const startTime = Date.now();
  const timeLimit = 30000; // 30 seconds max for backtracking engine

  let bestSchedule: any[] = [];
  let maxPlaced = -1;

  function solve(index: number) {
    if (index > maxPlaced) {
      maxPlaced = index;
      bestSchedule = JSON.parse(JSON.stringify(schedule)); // Save best state
    }
    
    if (index >= blocks.length) {
      return true;
    }
    
    if (Date.now() - startTime > timeLimit) {
      return false;
    }

    const block = blocks[index];
    const isPE = block.subject.toLowerCase().includes('penjas') || block.subject.toLowerCase().includes('olahraga');
    const validSlots: {d: number, p: number, penalty: number}[] = [];

    const subjectDays = new Set(schedule.filter(s => s.className === block.className && s.subject === block.subject).map(s => s.dayIndex));

    for (let d = 0; d < daysPerWeek; d++) {
      for (let p = 0; p <= periodsPerDay - block.blockSize; p++) {
        let isFree = true;
        for (let i = 0; i < block.blockSize; i++) {
          if (classTimetable[block.className][d][p + i] || teacherTimetable[block.teacherId][d][p + i]) {
            isFree = false;
            break;
          }
        }

        if (isFree) {
          let penalty = 0;
          
          // SC-01: Hindari hari yang sama untuk mapel yang sama
          if (subjectDays.has(d)) {
            penalty += 1000;
          }

          // Rule Waktu Khusus: Olahraga harus pagi (Jam 1 s.d 3, index 0,1,2)
          if (isPE && p > 2) {
            penalty += 500; 
          }

          // Rule Anti-Lubang: Minimalkan gap untuk siswa
          let isAdjacent = false;
          if (p > 0 && classTimetable[block.className][d][p - 1]) isAdjacent = true;
          if (p + block.blockSize < periodsPerDay && classTimetable[block.className][d][p + block.blockSize]) isAdjacent = true;
          
          if (!isAdjacent) {
            let isFirstClass = true;
            for (let m = 0; m < p; m++) {
              if (classTimetable[block.className][d][m]) {
                isFirstClass = false;
                break;
              }
            }
            if (!isFirstClass) {
              penalty += 50; // Gap di tengah jadwal
            } else {
               // Mulai agak siang (bukan jam 0), sedikit penalti
               if (p > 0) penalty += (p * 5);
            }
          }

          // Prioritaskan Jumat untuk blok 3 (opsional)
          if (block.blockSize === 3 && daysPerWeek > 4 && d === 4) {
            penalty -= 10;
          }

          validSlots.push({d, p, penalty});
        }
      }
    }

    // Urutkan berdasarkan penalty terkecil (paling optimal)
    validSlots.sort((a, b) => a.penalty - b.penalty);

    // Limit branching factor agar tidak terjebak (hanya coba 5 slot terbaik)
    const topSlots = validSlots.slice(0, 5); 

    for (const slot of topSlots) {
      // Place
      for (let i = 0; i < block.blockSize; i++) {
        classTimetable[block.className][slot.d][slot.p + i] = true;
        teacherTimetable[block.teacherId][slot.d][slot.p + i] = true;
        schedule.push({
          id: block.blockId + '_' + i,
          className: block.className,
          subject: block.subject,
          teacherId: block.teacherId,
          dayIndex: slot.d,
          periodIndex: slot.p + i
        });
      }

      if (solve(index + 1)) return true;

      // Backtrack
      for (let i = 0; i < block.blockSize; i++) {
        classTimetable[block.className][slot.d][slot.p + i] = false;
        teacherTimetable[block.teacherId][slot.d][slot.p + i] = false;
        schedule.pop();
      }
    }

    return false;
  }

  solve(0);

  // Reconstruct timetables dari state paling banyak blok berhasil ditempatkan
  const finalSchedule = [...bestSchedule];
  const placedBlockIds = new Set(finalSchedule.map(s => s.id.split('_')[0]));
  
  // Clear timetables
  for (const className in classTimetable) {
    for (let d=0; d<daysPerWeek; d++) for (let p=0; p<periodsPerDay; p++) classTimetable[className][d][p] = false;
  }
  for (const uid in teacherTimetable) {
    for (let d=0; d<daysPerWeek; d++) for (let p=0; p<periodsPerDay; p++) teacherTimetable[uid][d][p] = false;
  }
  
  // Re-apply timeOff
  teachers.forEach(t => {
    if (t.timeOff && teacherTimetable[t.uid]) {
      t.timeOff.forEach((to: string) => {
        const [d, p] = to.split('-').map(Number);
        if (d < daysPerWeek && p < periodsPerDay) teacherTimetable[t.uid][d][p] = true;
      });
    }
  });
  
  // Re-apply placed blocks
  for (const s of finalSchedule) {
    classTimetable[s.className][s.dayIndex][s.periodIndex] = true;
    teacherTimetable[s.teacherId][s.dayIndex][s.periodIndex] = true;
  }

  // Greedy fallback pass untuk blok yang tersisa (jika waktu habis / buntu)
  for (const block of blocks) {
    if (placedBlockIds.has(block.blockId)) continue;
    
    let placed = false;
    for (let d = 0; d < daysPerWeek && !placed; d++) {
      for (let p = 0; p <= periodsPerDay - block.blockSize && !placed; p++) {
        let isFree = true;
        for (let i = 0; i < block.blockSize; i++) {
          if (classTimetable[block.className][d][p + i] || teacherTimetable[block.teacherId][d][p + i]) {
            isFree = false;
            break;
          }
        }
        if (isFree) {
          for (let i = 0; i < block.blockSize; i++) {
            classTimetable[block.className][d][p + i] = true;
            teacherTimetable[block.teacherId][d][p + i] = true;
            finalSchedule.push({
              id: block.blockId + '_' + i,
              className: block.className,
              subject: block.subject,
              teacherId: block.teacherId,
              dayIndex: d,
              periodIndex: p + i
            });
          }
          placed = true;
        }
      }
    }
  }

  return finalSchedule;
}
