import assert from 'node:assert/strict';
import { roleCanAccess, roleRequirementForPath } from '../src/lib/role-access.js';

const portalCases = [
  ['/admin/fees', 'SCHOOL_ADMIN'],
  ['/accounting/fees', 'BURSAR'],
  ['/teacher/results', 'TEACHER'],
  ['/parent/invoices', 'PARENT'],
  ['/schoolbase-admin/audit', 'PLATFORM_ADMIN'],
] as const;

for (const [path, allowedRole] of portalCases) {
  const requirement = roleRequirementForPath(path);
  assert.equal(roleCanAccess(requirement, allowedRole), true, `${allowedRole} should access ${path}`);
  for (const deniedRole of ['SCHOOL_ADMIN', 'BURSAR', 'TEACHER', 'PARENT', 'STUDENT', 'PLATFORM_ADMIN']) {
    if (deniedRole !== allowedRole) {
      assert.equal(roleCanAccess(requirement, deniedRole), false, `${deniedRole} must not access ${path}`);
    }
  }
}

assert.equal(roleCanAccess(roleRequirementForPath('/api/bursar/overview'), 'BURSAR'), true);
assert.equal(roleCanAccess(roleRequirementForPath('/api/bursar/overview'), 'SCHOOL_ADMIN'), false);
assert.equal(roleCanAccess(roleRequirementForPath('/api/teacher/school'), 'TEACHER'), true);
assert.equal(roleCanAccess(roleRequirementForPath('/api/teacher/school'), 'SCHOOL_ADMIN'), false);
assert.equal(roleCanAccess(roleRequirementForPath('/api/admin/students/data'), 'SCHOOL_ADMIN'), true);
assert.equal(roleCanAccess(roleRequirementForPath('/api/admin/students/data'), 'TEACHER'), false);
assert.equal(roleCanAccess(roleRequirementForPath('/api/admin/invoices/invoice-1'), 'BURSAR'), true);
assert.equal(roleCanAccess(roleRequirementForPath('/api/admin/invoices/invoice-1'), 'PARENT'), false);
assert.equal(roleCanAccess(roleRequirementForPath('/api/admin/verify', 'POST'), null), true);
assert.equal(roleCanAccess(roleRequirementForPath('/api/parent/login', 'POST'), null), true);

console.log('Frontend role access tests passed');