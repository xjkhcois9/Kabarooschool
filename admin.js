import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";
import { getFirestore, collection, doc, getDoc, getDocs, addDoc, updateDoc, query, where, orderBy, limit, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

/*
  ضع إعدادات مشروع Firebase الخاص بك هنا.
  من Firebase Console > Project settings > Your apps > Web app
*/
// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCKmgV86tOBBD562OxsiMUcaxOhNkuau2E",
  authDomain: "school-management-dc25c.firebaseapp.com",
  databaseURL: "https://school-management-dc25c-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "school-management-dc25c",
  storageBucket: "school-management-dc25c.firebasestorage.app",
  messagingSenderId: "1057617132397",
  appId: "1:1057617132397:web:3de5fbdd46784792b33864",
  measurementId: "G-DX06HH66TV"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const state = { user:null, profile:null, teachers:[], students:[], classes:[], grades:[], attendance:[], exams:[], schedules:[], announcements:[] };

function toast(message){
  const el=$("#toast"); el.textContent=message; el.classList.add("show");
  clearTimeout(window.__toast); window.__toast=setTimeout(()=>el.classList.remove("show"),2600);
}
function todayISO(){ return new Date().toISOString().slice(0,10); }
function escapeHTML(v=""){ return String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c])); }
function fmtDate(v){ if(!v)return "-"; if(v?.toDate) v=v.toDate(); const d=new Date(v); return isNaN(d)?String(v):d.toLocaleDateString("ar-IQ"); }
function showModal(html){ $("#modalContent").innerHTML=html; $("#modal").classList.add("open"); }
function closeModal(){ $("#modal").classList.remove("open"); $("#modalContent").innerHTML=""; }
$("#modalClose").onclick=closeModal; $("#modal").addEventListener("click",e=>{if(e.target.id==="modal")closeModal()});

function nav(section){
  $$(".page-section").forEach(x=>x.classList.toggle("active",x.id===section));
  $$(".nav-item").forEach(x=>x.classList.toggle("active",x.dataset.section===section));
  const titles={dashboard:"لوحة المدير",teachers:"الكادر التدريسي والتكليفات",students:"بيانات الطلاب",expelled:"الطلاب المفصولون",classes:"الصفوف والشعب","grades-entry":"إدخال الدرجات",grades:"سجل الدرجات",attendance:"سجل الحضور",exams:"جدول الامتحانات",schedule:"الجدول الأسبوعي",notifications:"إرسال تنبيه",settings:"إعدادات الموقع"};
  $("#pageTitle").textContent=titles[section]||"لوحة المدير";
  $("#sidebar").classList.remove("open");
  if(section==="dashboard") refreshDashboard();
}
$$("[data-section]").forEach(btn=>btn.addEventListener("click",()=>nav(btn.dataset.section)));
$("#menuBtn").onclick=()=>$("#sidebar").classList.toggle("open");
$("#logoutBtn").onclick=()=>signOut(auth);

async function loadCollection(name){
  try{
    const snap=await getDocs(collection(db,name));
    return snap.docs.map(d=>({id:d.id,...d.data()}));
  }catch(e){ console.error(name,e); return []; }
}

async function loadData(){
  [state.teachers,state.students,state.classes,state.grades,state.attendance,state.exams,state.schedules,state.announcements] =
    await Promise.all(["teachers","students","classes","grades","attendance","exams","schedules","announcements"].map(loadCollection));
  renderAll();
}

async function loadProfile(user){
  const ref=doc(db,"users",user.uid); const snap=await getDoc(ref);
  if(!snap.exists()) throw new Error("حساب المدير لا يحتوي على وثيقة users.");
  const p=snap.data();
  if(p.role!=="admin") throw new Error("هذا الحساب ليس مديراً.");
  state.profile={id:snap.id,...p};
  $("#adminName").textContent=p.name||"المدير"; $("#welcomeName").textContent=p.name||"المدير"; $("#adminEmail").textContent=user.email||"";
}

function renderAll(){
  renderStats(); renderTeachers(); renderStudents(); renderExpelled(); renderClasses(); renderGrades(); renderExams(); renderSchedules(); renderNotifications(); populateSelects(); refreshAttendanceSummary();
}
function renderStats(){
  $("#statClasses").textContent=state.classes.length;
  $("#statTeachers").textContent=state.teachers.length;
  $("#statStudents").textContent=state.students.filter(s=>s.status!=="expelled").length;
  const a=state.attendance.filter(x=>x.date===todayISO());
  $("#statPresent").textContent=a.filter(x=>x.status==="present").length;
  $("#statAbsent").textContent=a.filter(x=>x.status==="absent").length;
}
function renderTeachers(){
  const q=($("#teacherSearch").value||"").toLowerCase(), f=$("#teacherFilter").value;
  const rows=state.teachers.filter(t=>(f==="all"||t.status===f||(!t.status&&f==="active"))).filter(t=>(`${t.name||""} ${t.specialization||""}`).toLowerCase().includes(q));
  $("#teachersTable").innerHTML=rows.length?rows.map(t=>{
    const count=state.classes.filter(c=>c.teacherIds?.includes(t.id)).length + (t.teachingAssignments?.length||0);
    return `<tr><td><strong>${escapeHTML(t.name)}</strong></td><td>${escapeHTML(t.specialization||"-")}</td><td>${escapeHTML(t.phone||"-")}</td><td>${count}</td><td><span class="badge ${t.status==="inactive"?"inactive":"active"}">${t.status==="inactive"?"غير نشط":"نشط"}</span></td><td><div class="actions"><button class="small-btn" onclick="editTeacher('${t.id}')">تعديل</button><button class="small-btn" onclick="assignTeacher('${t.id}')">تكليف</button></div></td></tr>`
  }).join(""):`<tr><td colspan="6"><div class="empty">لا توجد نتائج.</div></td></tr>`;
}
function renderStudents(){
  const q=($("#studentSearch").value||"").toLowerCase(), f=$("#studentClassFilter").value;
  const rows=state.students.filter(s=>s.status!=="expelled").filter(s=>(f==="all"||`${s.classId}_${s.sectionId}`===f)).filter(s=>(`${s.name||""} ${s.studentId||""}`).toLowerCase().includes(q));
  $("#studentsTable").innerHTML=rows.length?rows.map(s=>`<tr><td>${escapeHTML(s.studentId||s.id)}</td><td><strong>${escapeHTML(s.name)}</strong></td><td>${escapeHTML(s.className||s.classId||"-")}</td><td>${escapeHTML(s.sectionName||s.sectionId||"-")}</td><td>${escapeHTML(s.phone||"-")}</td><td><span class="badge active">نشط</span></td><td><div class="actions"><button class="small-btn" onclick="editStudent('${s.id}')">تعديل</button><button class="small-btn" onclick="expelStudent('${s.id}')">فصل</button></div></td></tr>`).join(""):`<tr><td colspan="7"><div class="empty">لا توجد نتائج.</div></td></tr>`;
}
function renderExpelled(){
 const rows=state.students.filter(s=>s.status==="expelled");
 $("#expelledTable").innerHTML=rows.length?rows.map(s=>`<tr><td>${escapeHTML(s.studentId||s.id)}</td><td>${escapeHTML(s.name)}</td><td>${escapeHTML(s.className||s.classId||"-")}</td><td>${fmtDate(s.expelledAt)}</td><td>${escapeHTML(s.expelReason||"-")}</td><td><button class="small-btn" onclick="restoreStudent('${s.id}')">إعادة تفعيل</button></td></tr>`).join(""):`<tr><td colspan="6"><div class="empty">لا يوجد طلاب مفصولون.</div></td></tr>`;
}
function renderClasses(){
 $("#classesList").innerHTML=state.classes.length?state.classes.map(c=>`<div class="class-card"><h3>${escapeHTML(c.name||c.className||"صف")}</h3><p>الشعبة: ${escapeHTML(c.sectionName||c.section||"-")}</p><p>السنة الدراسية: ${escapeHTML(c.academicYear||"-")}</p><button class="small-btn" onclick="editClass('${c.id}')">تعديل</button></div>`).join(""):`<div class="panel empty">لا توجد صفوف وشعب بعد.</div>`;
}
function renderGrades(){
 const q=($("#gradeSearch").value||"").toLowerCase();
 const rows=state.grades.filter(g=>(`${g.studentName||""} ${g.subject||""}`).toLowerCase().includes(q));
 $("#gradesTable").innerHTML=rows.length?rows.map(g=>`<tr><td>${escapeHTML(g.studentName||g.studentId)}</td><td>${escapeHTML(g.subject)}</td><td>${escapeHTML(g.exam||"-")}</td><td><strong>${escapeHTML(g.value)}</strong></td><td>${fmtDate(g.createdAt)}</td></tr>`).join(""):`<tr><td colspan="5"><div class="empty">لا توجد درجات.</div></td></tr>`;
}
function renderExams(){
 $("#examsTable").innerHTML=state.exams.length?state.exams.map(e=>`<tr><td>${escapeHTML(e.subject)}</td><td>${escapeHTML(e.className||e.classId||"-")} / ${escapeHTML(e.sectionName||e.sectionId||"-")}</td><td>${escapeHTML(e.date||"-")}</td><td>${escapeHTML(e.time||"-")}</td><td>${escapeHTML(e.room||"-")}</td><td><button class="small-btn" onclick="deleteDocItem('exams','${e.id}')">حذف</button></td></tr>`).join(""):`<tr><td colspan="6"><div class="empty">لا يوجد جدول امتحانات.</div></td></tr>`;
}
function renderSchedules(){
 $("#scheduleTable").innerHTML=state.schedules.length?state.schedules.map(s=>`<tr><td>${escapeHTML(s.day)}</td><td>${escapeHTML(s.period)}</td><td>${escapeHTML(s.className||s.classId||"-")} / ${escapeHTML(s.sectionName||s.sectionId||"-")}</td><td>${escapeHTML(s.subject)}</td><td>${escapeHTML(s.teacherName||s.teacherId||"-")}</td><td><button class="small-btn" onclick="deleteDocItem('schedules','${s.id}')">حذف</button></td></tr>`).join(""):`<tr><td colspan="6"><div class="empty">لا يوجد جدول أسبوعي.</div></td></tr>`;
}
function renderNotifications(){
 $("#notificationsList").innerHTML=state.announcements.length?state.announcements.sort((a,b)=>String(b.createdAt||"").localeCompare(String(a.createdAt||""))).slice(0,20).map(a=>`<div class="activity-item"><strong>${escapeHTML(a.title)}</strong><small>${escapeHTML(a.body)} — الجهة: ${escapeHTML(a.targetLabel||a.target||"الجميع")}</small></div>`).join(""):`<div class="empty">لا توجد تنبيهات.</div>`;
 const latest=state.announcements.slice(0,4);
 $("#latestAnnouncements").innerHTML=latest.length?latest.map(a=>`<div class="activity-item"><strong>${escapeHTML(a.title)}</strong><small>${escapeHTML(a.targetLabel||a.target||"الجميع")}</small></div>`).join(""):`<div class="empty">لا توجد إعلانات بعد.</div>`;
}
function populateSelects(){
 const classOptions=state.classes.map(c=>`<option value="${escapeHTML(c.id)}">${escapeHTML(c.name||c.className)} / ${escapeHTML(c.sectionName||c.section||"")}</option>`).join("");
 $("#studentClassFilter").innerHTML=`<option value="all">كل الصفوف والشعب</option>${classOptions}`;
 $("#attendanceClassFilter").innerHTML=`<option value="all">كل الصفوف والشعب</option>${classOptions}`;
 $("#gradeStudent").innerHTML=state.students.filter(s=>s.status!=="expelled").map(s=>`<option value="${s.id}">${escapeHTML(s.name)} — ${escapeHTML(s.studentId||s.id)}</option>`).join("");
}
function refreshAttendanceSummary(){
 const a=state.attendance.filter(x=>x.date===todayISO());
 $("#sumPresent").textContent=a.filter(x=>x.status==="present").length;
 $("#sumAbsent").textContent=a.filter(x=>x.status==="absent").length;
 $("#sumLate").textContent=a.filter(x=>x.status==="late").length;
 $("#sumLeave").textContent=a.filter(x=>x.status==="leave").length;
}
function refreshDashboard(){renderStats();refreshAttendanceSummary();renderNotifications()}

function teacherForm(t={}){
 return `<h2>${t.id?"تعديل مدرس":"إضافة مدرس"}</h2><div class="form-grid"><label>الاسم<input id="mName" value="${escapeHTML(t.name||"")}"></label><label>التخصص<input id="mSpec" value="${escapeHTML(t.specialization||"")}"></label><label>الهاتف<input id="mPhone" value="${escapeHTML(t.phone||"")}"></label><label>البريد<input id="mEmail" value="${escapeHTML(t.email||"")}"></label><label>الحالة<select id="mStatus"><option value="active" ${t.status!=="inactive"?"selected":""}>نشط</option><option value="inactive" ${t.status==="inactive"?"selected":""}>غير نشط</option></select></label><button class="primary" id="saveTeacher">حفظ</button></div>`;
}
$("#addTeacherBtn").onclick=()=>{showModal(teacherForm());$("#saveTeacher").onclick=async()=>{await addDoc(collection(db,"teachers"),{name:$("#mName").value.trim(),specialization:$("#mSpec").value.trim(),phone:$("#mPhone").value.trim(),email:$("#mEmail").value.trim(),status:$("#mStatus").value,createdAt:serverTimestamp()});closeModal();toast("تمت إضافة المدرس");await loadData()}};
window.editTeacher=async(id)=>{const t=state.teachers.find(x=>x.id===id);showModal(teacherForm(t));$("#saveTeacher").onclick=async()=>{await updateDoc(doc(db,"teachers",id),{name:$("#mName").value.trim(),specialization:$("#mSpec").value.trim(),phone:$("#mPhone").value.trim(),email:$("#mEmail").value.trim(),status:$("#mStatus").value,updatedAt:serverTimestamp()});closeModal();toast("تم تحديث بيانات المدرس");await loadData()}};
window.assignTeacher=(id)=>{const t=state.teachers.find(x=>x.id===id);const opts=state.classes.map(c=>`<option value="${c.id}">${escapeHTML(c.name||c.className)} / ${escapeHTML(c.sectionName||c.section||"")}</option>`).join("");showModal(`<h2>تكليف ${escapeHTML(t.name)}</h2><p>أضف تكليفاً تدريسياً: مادة + صف + شعبة. يمكن تكرار العملية بلا حد.</p><div class="form-grid"><label>المادة<input id="aSubject"></label><label>الصف/الشعبة<select id="aClass">${opts}</select></label><button class="primary" id="saveAssign">إضافة التكليف</button></div>`);$("#saveAssign").onclick=async()=>{const c=state.classes.find(x=>x.id===$("#aClass").value);const arr=t.teachingAssignments||[];arr.push({subject:$("#aSubject").value.trim(),classId:c.id,className:c.name||c.className,sectionId:c.sectionId||c.section,classSection:c.sectionName||c.section||""});await updateDoc(doc(db,"teachers",id),{teachingAssignments:arr,updatedAt:serverTimestamp()});closeModal();toast("تمت إضافة التكليف");await loadData()}};

function studentForm(s={}){
 const opts=state.classes.map(c=>`<option value="${c.id}" ${s.classId===c.id?"selected":""}>${escapeHTML(c.name||c.className)} / ${escapeHTML(c.sectionName||c.section||"")}</option>`).join("");
 return `<h2>${s.id?"تعديل طالب":"إضافة طالب"}</h2><div class="form-grid"><label>رقم الطالب<input id="sId" value="${escapeHTML(s.studentId||"")}"></label><label>الاسم الكامل<input id="sName" value="${escapeHTML(s.name||"")}"></label><label>الصف والشعبة<select id="sClass">${opts}</select></label><label>الهاتف<input id="sPhone" value="${escapeHTML(s.phone||"")}"></label><label>البريد<input id="sEmail" value="${escapeHTML(s.email||"")}"></label><button class="primary" id="saveStudent">حفظ</button></div>`;
}
$("#addStudentBtn").onclick=()=>{showModal(studentForm());$("#saveStudent").onclick=async()=>{const c=state.classes.find(x=>x.id===$("#sClass").value);await addDoc(collection(db,"students"),{studentId:$("#sId").value.trim(),name:$("#sName").value.trim(),classId:c?.id||"",className:c?.name||c?.className||"",sectionId:c?.sectionId||c?.section||"",sectionName:c?.sectionName||c?.section||"",phone:$("#sPhone").value.trim(),email:$("#sEmail").value.trim(),status:"active",createdAt:serverTimestamp()});closeModal();toast("تمت إضافة الطالب");await loadData()}};
window.editStudent=async(id)=>{const s=state.students.find(x=>x.id===id);showModal(studentForm(s));$("#saveStudent").onclick=async()=>{const c=state.classes.find(x=>x.id===$("#sClass").value);await updateDoc(doc(db,"students",id),{studentId:$("#sId").value.trim(),name:$("#sName").value.trim(),classId:c?.id||"",className:c?.name||c?.className||"",sectionId:c?.sectionId||c?.section||"",sectionName:c?.sectionName||c?.section||"",phone:$("#sPhone").value.trim(),email:$("#sEmail").value.trim(),updatedAt:serverTimestamp()});closeModal();toast("تم تحديث الطالب");await loadData()}};
window.expelStudent=async(id)=>{const reason=prompt("سبب الفصل:");if(reason===null)return;await updateDoc(doc(db,"students",id),{status:"expelled",expelReason:reason,expelledAt:serverTimestamp(),updatedAt:serverTimestamp()});toast("تم نقل الطالب إلى قائمة المفصولين");await loadData()};
window.restoreStudent=async(id)=>{await updateDoc(doc(db,"students",id),{status:"active",updatedAt:serverTimestamp()});toast("تمت إعادة تفعيل الطالب");await loadData()};

$("#addClassBtn").onclick=()=>{showModal(`<h2>إضافة صف وشعبة</h2><div class="form-grid"><label>اسم الصف<input id="cName" placeholder="الرابع الإعدادي"></label><label>اسم الشعبة<input id="cSection" placeholder="A"></label><label>العام الدراسي<input id="cYear" value="2026-2027"></label><button class="primary" id="saveClass">حفظ</button></div>`);$("#saveClass").onclick=async()=>{await addDoc(collection(db,"classes"),{name:$("#cName").value.trim(),sectionName:$("#cSection").value.trim(),academicYear:$("#cYear").value.trim(),createdAt:serverTimestamp()});closeModal();toast("تمت إضافة الصف والشعبة");await loadData()}};
window.editClass=(id)=>{const c=state.classes.find(x=>x.id===id);showModal(`<h2>تعديل الصف والشعبة</h2><div class="form-grid"><label>اسم الصف<input id="ecName" value="${escapeHTML(c.name||c.className||"")}"></label><label>الشعبة<input id="ecSection" value="${escapeHTML(c.sectionName||c.section||"")}"></label><label>العام الدراسي<input id="ecYear" value="${escapeHTML(c.academicYear||"")}"></label><button class="primary" id="ecSave">حفظ</button></div>`);$("#ecSave").onclick=async()=>{await updateDoc(doc(db,"classes",id),{name:$("#ecName").value.trim(),sectionName:$("#ecSection").value.trim(),academicYear:$("#ecYear").value.trim(),updatedAt:serverTimestamp()});closeModal();toast("تم التحديث");await loadData()}};

$("#saveGradeBtn").onclick=async()=>{const s=state.students.find(x=>x.id===$("#gradeStudent").value);const value=Number($("#gradeValue").value);if(!s||!$("#gradeSubject").value.trim()||!$("#gradeExam").value.trim()||Number.isNaN(value))return toast("أكمل بيانات الدرجة");await addDoc(collection(db,"grades"),{studentId:s.id,studentName:s.name,subject:$("#gradeSubject").value.trim(),exam:$("#gradeExam").value.trim(),value,createdAt:serverTimestamp()});toast("تم حفظ الدرجة");$("#gradeValue").value="";await loadData()};
$("#gradeSearch").oninput=renderGrades;$("#teacherSearch").oninput=renderTeachers;$("#teacherFilter").onchange=renderTeachers;$("#studentSearch").oninput=renderStudents;$("#studentClassFilter").onchange=renderStudents;

$("#attendanceDate").value=todayISO();
$("#loadAttendanceBtn").onclick=renderAttendance;
async function renderAttendance(){
 const date=$("#attendanceDate").value||todayISO(), cls=$("#attendanceClassFilter").value;
 const students=state.students.filter(s=>s.status!=="expelled").filter(s=>cls==="all"||s.classId===cls);
 const existing=state.attendance.filter(a=>a.date===date);
 $("#attendanceTable").innerHTML=students.length?students.map(s=>{const a=existing.find(x=>x.studentId===s.id);const status=a?.status||"present";return `<tr><td>${escapeHTML(s.name)}</td><td>${escapeHTML(s.className||s.classId||"-")}</td><td>${escapeHTML(s.sectionName||s.sectionId||"-")}</td><td><select id="att-${s.id}"><option value="present" ${status==="present"?"selected":""}>حاضر</option><option value="absent" ${status==="absent"?"selected":""}>غائب</option><option value="late" ${status==="late"?"selected":""}>متأخر</option><option value="leave" ${status==="leave"?"selected":""}>إجازة</option></select></td><td><button class="small-btn" onclick="saveAttendance('${s.id}','${a?.id||""}')">حفظ</button></td></tr>`}).join(""):`<tr><td colspan="5"><div class="empty">لا توجد طلاب.</div></td></tr>`;
}
window.saveAttendance=async(studentId,aid)=>{const s=state.students.find(x=>x.id===studentId), date=$("#attendanceDate").value, status=$(`#att-${studentId}`).value;const data={studentId,studentName:s.name,date,status,classId:s.classId,sectionId:s.sectionId,updatedAt:serverTimestamp()};if(aid)await updateDoc(doc(db,"attendance",aid),data);else await addDoc(collection(db,"attendance"),{...data,createdAt:serverTimestamp()});toast("تم حفظ الحضور");await loadData();await renderAttendance()};
$("#attendanceClassFilter").onchange=renderAttendance;

$("#addExamBtn").onclick=()=>{const opts=state.classes.map(c=>`<option value="${c.id}">${escapeHTML(c.name||c.className)} / ${escapeHTML(c.sectionName||c.section||"")}</option>`).join("");showModal(`<h2>إضافة امتحان</h2><div class="form-grid"><label>المادة<input id="eSubject"></label><label>الصف/الشعبة<select id="eClass">${opts}</select></label><label>التاريخ<input id="eDate" type="date"></label><label>الوقت<input id="eTime" type="time"></label><label>القاعة<input id="eRoom"></label><button class="primary" id="saveExam">حفظ</button></div>`);$("#saveExam").onclick=async()=>{const c=state.classes.find(x=>x.id===$("#eClass").value);await addDoc(collection(db,"exams"),{subject:$("#eSubject").value.trim(),classId:c?.id,className:c?.name||c?.className||"",sectionId:c?.sectionId||c?.section||"",sectionName:c?.sectionName||c?.section||"",date:$("#eDate").value,time:$("#eTime").value,room:$("#eRoom").value.trim(),createdAt:serverTimestamp()});closeModal();toast("تمت إضافة الامتحان");await loadData()}};

$("#addScheduleBtn").onclick=()=>{const opts=state.classes.map(c=>`<option value="${c.id}">${escapeHTML(c.name||c.className)} / ${escapeHTML(c.sectionName||c.section||"")}</option>`).join(""), teachers=state.teachers.map(t=>`<option value="${t.id}">${escapeHTML(t.name)}</option>`).join("");showModal(`<h2>إضافة حصة</h2><div class="form-grid"><label>اليوم<select id="dDay"><option>الأحد</option><option>الاثنين</option><option>الثلاثاء</option><option>الأربعاء</option><option>الخميس</option><option>الجمعة</option><option>السبت</option></select></label><label>الحصة<input id="dPeriod" placeholder="1"></label><label>الصف/الشعبة<select id="dClass">${opts}</select></label><label>المادة<input id="dSubject"></label><label>المدرس<select id="dTeacher">${teachers}</select></label><button class="primary" id="saveSchedule">حفظ</button></div>`);$("#saveSchedule").onclick=async()=>{const c=state.classes.find(x=>x.id===$("#dClass").value),t=state.teachers.find(x=>x.id===$("#dTeacher").value);await addDoc(collection(db,"schedules"),{day:$("#dDay").value,period:$("#dPeriod").value,classId:c?.id,className:c?.name||c?.className||"",sectionId:c?.sectionId||c?.section||"",sectionName:c?.sectionName||c?.section||"",subject:$("#dSubject").value.trim(),teacherId:t?.id||"",teacherName:t?.name||"",createdAt:serverTimestamp()});closeModal();toast("تمت إضافة الحصة");await loadData()}};

window.deleteDocItem=async(col,id)=>{if(!confirm("هل تريد الحذف؟"))return;await updateDoc(doc(db,col,id),{deleted:true,deletedAt:serverTimestamp()});toast("تم تنفيذ العملية");await loadData()};

$("#notifyTarget").onchange=()=>{const v=$("#notifyTarget").value, wrap=$("#notifyTargetValueWrap");if(["class","section","individual"].includes(v)){wrap.classList.remove("hidden");let opts="";if(v==="individual")opts=state.students.concat(state.teachers).map(x=>`<option value="${x.id}">${escapeHTML(x.name)}</option>`).join("");else opts=state.classes.map(c=>`<option value="${c.id}">${escapeHTML(c.name||c.className)} / ${escapeHTML(c.sectionName||c.section||"")}</option>`).join("");$("#notifyTargetValue").innerHTML=opts}else wrap.classList.add("hidden")};
$("#sendNotificationBtn").onclick=async()=>{const target=$("#notifyTarget").value,title=$("#notifyTitle").value.trim(),body=$("#notifyBody").value.trim();if(!title||!body)return toast("أدخل عنوان ونص التنبيه");const labels={all:"الجميع",students:"جميع الطلاب",teachers:"جميع المدرسين",class:"صف",section:"شعبة",individual:"مستخدم محدد"};await addDoc(collection(db,"announcements"),{title,body,target,targetId:$("#notifyTargetValue").value||"",targetLabel:labels[target],createdBy:state.user.uid,createdAt:serverTimestamp()});toast("تم إرسال التنبيه");$("#notifyTitle").value="";$("#notifyBody").value="";await loadData()};

async function loadSettings(){
 try{const s=await getDoc(doc(db,"settings","school"));if(s.exists()){const d=s.data();$("#setSchoolName").value=d.schoolName||"";$("#setAcademicYear").value=d.academicYear||"";$("#setPhone").value=d.phone||"";$("#setAddress").value=d.address||"";$("#setDescription").value=d.description||"";$("#schoolNameSide").textContent=d.schoolName||"مدرستي"}}catch(e){}
}
$("#saveSettingsBtn").onclick=async()=>{await updateDoc(doc(db,"settings","school"),{schoolName:$("#setSchoolName").value.trim(),academicYear:$("#setAcademicYear").value.trim(),phone:$("#setPhone").value.trim(),address:$("#setAddress").value.trim(),description:$("#setDescription").value.trim(),updatedAt:serverTimestamp()}).catch(async()=>{await addDoc(collection(db,"settings"),{})});toast("تم حفظ الإعدادات");await loadSettings()};

$("#todayDate").textContent=new Date().toLocaleDateString("ar-IQ",{weekday:"long",year:"numeric",month:"long",day:"numeric"});

onAuthStateChanged(auth,async(user)=>{
 try{
  if(!user) throw new Error("يجب تسجيل الدخول أولاً.");
  state.user=user; await loadProfile(user); await loadSettings(); await loadData();
  $("#authOverlay").classList.add("hide"); $("#connectionStatus").textContent="متصل";
 }catch(e){
  console.error(e); $("#authOverlay").innerHTML=`<div class="auth-card"><div class="brand-mark">!</div><h2>تعذر فتح لوحة المدير</h2><p>${escapeHTML(e.message)}</p><p>تأكد من Firebase Config وأن حسابك يحمل role = admin.</p></div>`;
 }
});
