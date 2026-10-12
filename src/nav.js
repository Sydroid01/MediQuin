// One URL per page. Reloading the browser keeps you on the same URL, so you stay on the same page.
export const PATH = {
  home: '/',
  req: '/staff/request', my: '/staff/my-requests', list: '/staff/equipment',
  queue: '/custodian/queue', perm: '/custodian/permission', stat: '/custodian/status',
  emp: '/admin/employees', meq: '/admin/equipment', log: '/admin/logs',
  report: '/report-problem', myrep: '/staff/my-repairs',           // report: any signed-in role.  myrep: Staff
  rep: '/repairs', inv: '/inventory',                               // Custodian and Admin (Admin can also edit the inventory)
}

// [key, title, description, icon] for each role. Drives both the navigation bar and the home tiles.
export const TASKS = {
  Admin: [['emp', 'Manage Employees', 'Add, update and remove hospital staff.', 'users'], ['meq', 'Manage Equipment', 'Departments, equipment and unit status.', 'eq'], ['log', 'Audit Logs', 'Every request, approval and return.', 'shield'],
    ['rep', 'Repair Requests', 'Review, prioritize and track repairs.', 'wrench'], ['inv', 'Equipment Inventory', 'Serial numbers, suppliers, warranty and condition.', 'box']],
  Custodian: [['queue', 'Request Queue', 'Staff requests waiting for review.', 'clip'], ['perm', 'Equipment Permission', 'Approve requests and record walk-ins.', 'ok'], ['stat', 'View Equipment Status', 'Search and filter every unit.', 'search'],
    ['rep', 'Repair Requests', 'Review, prioritize and track repairs.', 'wrench'], ['inv', 'Equipment Inventory', 'Serial numbers, suppliers, warranty and condition.', 'box']],
  Staff: [['req', 'Request Equipment', 'Borrow equipment for your unit.', 'eq'], ['my', 'Requested Equipment Status', 'Follow a request through to return.', 'clock'], ['list', 'Equipment List', 'See the equipment you can borrow.', 'list'],
    ['report', 'Report a Problem', 'Report faulty or damaged equipment.', 'alert'], ['myrep', 'My Repair Requests', 'Follow your reports through to repair.', 'wrench']],
}
export const LATEST = { Admin: 'log', Custodian: 'queue', Staff: 'my' }
