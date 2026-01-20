import { mat4, vec3 } from 'gl-matrix';

export function yawPitchRollToMat4(out, yaw, pitch, roll) {
  mat4.identity(out);
  mat4.rotateY(out, out, yaw);
  mat4.rotateX(out, out, pitch);
  mat4.rotateZ(out, out, roll);
  return out;
}

export function mat4ToYawPitchRoll(out, mat) {
  var m00 = mat[0];
  var m01 = mat[1];
  var m02 = mat[2];
  var m10 = mat[4];
  var m11 = mat[5];
  var m12 = mat[6];
  var m20 = mat[8];
  var m21 = mat[9];
  var m22 = mat[10];

  var len0 = Math.hypot(m00, m01, m02);
  var len1 = Math.hypot(m10, m11, m12);
  var len2 = Math.hypot(m20, m21, m22);

  if (len0 > 0.0) { m00 /= len0; m01 /= len0; m02 /= len0; }
  if (len1 > 0.0) { m10 /= len1; m11 /= len1; m12 /= len1; }
  if (len2 > 0.0) { m20 /= len2; m21 /= len2; m22 /= len2; }

  var pitch = Math.asin(Math.max(-1.0, Math.min(1.0, -m21)));
  var yaw = Math.atan2(m20, m22);
  var roll = Math.atan2(m01, m11);

  return vec3.set(out, yaw, pitch, roll);
}
