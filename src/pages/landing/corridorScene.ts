import * as THREE from 'three'

export type CharacterId = 'rafi' | 'mim'

export type HostelSceneOptions = {
  onSelect?: (id: CharacterId | null) => void
}

export type HostelSceneHandle = {
  setProgress: (value: number) => void
  setSelected: (id: CharacterId | null) => void
  setActive: (active: boolean) => void
  resize: () => void
  dispose: () => void
}

type CharacterRig = {
  group: THREE.Group
  armL: THREE.Mesh
  armR: THREE.Mesh
  head: THREE.Mesh
  ring: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>
  baseY: number
  phase: number
}

type CameraKey = {
  p: number
  pos: THREE.Vector3
  look: THREE.Vector3
}

const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value))
const smoothstep = (t: number) => t * t * (3 - 2 * t)

const FLOOR_Y = 0
const CORRIDOR_Z = -14
const CORRIDOR_LENGTH = 64

function makeCanvas(width: number, height: number) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D is unavailable')
  return { canvas, ctx }
}

function finishTexture(canvas: HTMLCanvasElement) {
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 4
  return texture
}

function makeFloorTexture() {
  const { canvas, ctx } = makeCanvas(256, 256)
  ctx.fillStyle = '#102f3d'
  ctx.fillRect(0, 0, 256, 256)

  ctx.strokeStyle = 'rgba(112, 219, 198, 0.16)'
  ctx.lineWidth = 3
  for (let i = 0; i <= 256; i += 64) {
    ctx.beginPath()
    ctx.moveTo(i, 0)
    ctx.lineTo(i, 256)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(0, i)
    ctx.lineTo(256, i)
    ctx.stroke()
  }

  for (let i = 0; i < 60; i += 1) {
    const x = Math.random() * 256
    const y = Math.random() * 256
    const size = 1 + Math.random() * 4
    ctx.fillStyle = `rgba(3, 18, 26, ${0.12 + Math.random() * 0.2})`
    ctx.fillRect(x, y, size, size)
  }

  const texture = finishTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(3, 26)
  return texture
}

function makeSignTexture(title: string, subtitle: string, accent = '#f2b544', background = '#0b2230') {
  const { canvas, ctx } = makeCanvas(512, 256)
  ctx.fillStyle = background
  ctx.fillRect(0, 0, 512, 256)
  ctx.strokeStyle = accent
  ctx.lineWidth = 10
  ctx.strokeRect(9, 9, 494, 238)

  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = accent
  ctx.font = '900 104px Arial, sans-serif'
  ctx.fillText(title, 256, 108)

  ctx.fillStyle = '#d7e3e8'
  ctx.font = '700 34px Arial, sans-serif'
  ctx.fillText(subtitle.toUpperCase(), 256, 196)

  return finishTexture(canvas)
}

function makePosterTexture(title: string, subtitle: string, accent: string) {
  const { canvas, ctx } = makeCanvas(512, 320)
  ctx.fillStyle = '#0c2633'
  ctx.fillRect(0, 0, 512, 320)
  ctx.strokeStyle = accent
  ctx.lineWidth = 8
  ctx.strokeRect(10, 10, 492, 300)

  ctx.fillStyle = accent
  ctx.font = '900 62px Arial, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText(title, 256, 138)

  ctx.fillStyle = '#a4bbc9'
  ctx.font = '700 26px Arial, sans-serif'
  ctx.fillText(subtitle.toUpperCase(), 256, 206)

  ctx.fillStyle = accent
  ctx.fillRect(88, 244, 336, 8)
  return finishTexture(canvas)
}

function makeNameSprite(name: string, role: string, accent: string) {
  const { canvas, ctx } = makeCanvas(512, 160)
  ctx.clearRect(0, 0, 512, 160)
  ctx.fillStyle = 'rgba(7, 25, 35, 0.88)'
  ctx.beginPath()
  ctx.roundRect(10, 16, 492, 128, 18)
  ctx.fill()
  ctx.strokeStyle = accent
  ctx.lineWidth = 5
  ctx.stroke()

  ctx.textAlign = 'center'
  ctx.fillStyle = '#f6f0e2'
  ctx.font = '900 58px Arial, sans-serif'
  ctx.fillText(name.toUpperCase(), 256, 80)

  ctx.fillStyle = accent
  ctx.font = '700 24px Arial, sans-serif'
  ctx.fillText(role.toUpperCase(), 256, 118)

  const texture = finishTexture(canvas)
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
  })
  const sprite = new THREE.Sprite(material)
  sprite.scale.set(1.3, 0.42, 1)
  return sprite
}

function box(
  width: number,
  height: number,
  depth: number,
  material: THREE.Material,
  x: number,
  y: number,
  z: number,
) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material)
  mesh.position.set(x, y, z)
  return mesh
}

function makeCharacter(
  id: CharacterId,
  palette: {
    skin: number
    hoodie: number
    accent: number
    pants: number
    hair: number
  },
  x: number,
  z: number,
  phase: number,
): CharacterRig {
  const group = new THREE.Group()
  group.position.set(x, FLOOR_Y, z)
  group.rotation.y = x > 0 ? -0.35 : 0.35
  group.userData.characterId = id

  const skin = new THREE.MeshStandardMaterial({ color: palette.skin, roughness: 0.85 })
  const hoodie = new THREE.MeshStandardMaterial({ color: palette.hoodie, roughness: 0.9 })
  const accent = new THREE.MeshStandardMaterial({ color: palette.accent, roughness: 0.75 })
  const pants = new THREE.MeshStandardMaterial({ color: palette.pants, roughness: 0.92 })
  const hair = new THREE.MeshStandardMaterial({ color: palette.hair, roughness: 0.9 })
  const dark = new THREE.MeshStandardMaterial({ color: 0x0a1a22, roughness: 0.8 })

  for (const side of [-1, 1]) {
    group.add(box(0.23, 0.78, 0.26, pants, side * 0.17, 0.42, 0))
    group.add(box(0.27, 0.16, 0.42, dark, side * 0.17, 0.09, 0.08))
  }

  const torso = box(0.66, 0.78, 0.38, hoodie, 0, 1.19, 0)
  group.add(torso)
  group.add(box(0.38, 0.16, 0.03, accent, 0, 1.01, 0.2))

  const armL = box(0.19, 0.68, 0.23, hoodie, -0.43, 1.14, 0)
  armL.rotation.z = -0.08
  const armR = box(0.19, 0.68, 0.23, hoodie, 0.43, 1.14, 0)
  armR.rotation.z = 0.08
  group.add(armL, armR)

  const handL = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), skin)
  handL.position.set(-0.48, 0.78, 0.02)
  const handR = handL.clone()
  handR.position.x = 0.48
  group.add(handL, handR)

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.11, 0.12, 10), skin)
  neck.position.set(0, 1.63, 0)
  group.add(neck)

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.29, 18, 14), skin)
  head.position.set(0, 1.83, 0)
  head.scale.set(1, 1.08, 0.96)
  group.add(head)

  const hairCap = new THREE.Mesh(
    new THREE.SphereGeometry(0.3, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.42),
    hair,
  )
  hairCap.position.set(0, 1.88, -0.01)
  group.add(hairCap)

  const hairBack = new THREE.Mesh(new THREE.SphereGeometry(0.27, 14, 10), hair)
  hairBack.scale.set(1, 1.05, 0.72)
  hairBack.position.set(0, 1.82, -0.13)
  group.add(hairBack)

  for (const side of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), skin)
    ear.position.set(side * 0.28, 1.82, 0)
    group.add(ear)

    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.036, 8, 6), dark)
    eye.position.set(side * 0.1, 1.86, 0.26)
    group.add(eye)

    const brow = box(0.1, 0.018, 0.02, hair, side * 0.1, 1.94, 0.27)
    brow.rotation.z = side * 0.08
    group.add(brow)
  }

  const nose = box(0.045, 0.06, 0.04, skin, 0, 1.79, 0.29)
  group.add(nose)
  group.add(box(0.12, 0.018, 0.012, dark, 0, 1.7, 0.278))

  if (id === 'rafi') {
    const headband = new THREE.Mesh(new THREE.TorusGeometry(0.31, 0.035, 8, 24, Math.PI), dark)
    headband.position.set(0, 1.86, 0)
    group.add(headband)

    for (const side of [-1, 1]) {
      const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.07, 12), accent)
      cup.rotation.z = Math.PI / 2
      cup.position.set(side * 0.3, 1.82, 0)
      group.add(cup)
    }

    group.add(box(0.03, 0.22, 0.02, accent, -0.13, 1.38, 0.2))
    group.add(box(0.03, 0.22, 0.02, accent, 0.13, 1.38, 0.2))
  } else {
    const ponytail = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 10), hair)
    ponytail.scale.set(0.8, 1.5, 0.8)
    ponytail.position.set(0, 1.7, -0.3)
    group.add(ponytail)

    const tie = new THREE.Mesh(new THREE.TorusGeometry(0.105, 0.026, 8, 18), accent)
    tie.position.set(0, 1.82, -0.28)
    tie.rotation.x = Math.PI / 2
    group.add(tie)

    const strap = box(0.07, 0.95, 0.03, accent, 0.16, 1.2, 0.21)
    strap.rotation.z = -0.36
    group.add(strap)

    const bag = box(0.3, 0.26, 0.13, accent, 0.37, 0.9, 0.08)
    group.add(bag)
  }

  const label = makeNameSprite(
    id === 'rafi' ? 'Rafi' : 'Mim',
    id === 'rafi' ? 'The night owl' : 'Guild captain',
    id === 'rafi' ? '#70dbc6' : '#f2b544',
  )
  label.position.set(0, 2.46, 0)
  group.add(label)

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.5, 0.61, 36),
    new THREE.MeshBasicMaterial({
      color: palette.accent,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  )
  ring.rotation.x = -Math.PI / 2
  ring.position.y = 0.012
  group.add(ring)

  const hitbox = new THREE.Mesh(
    new THREE.BoxGeometry(1.35, 2.5, 1.1),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }),
  )
  hitbox.position.y = 1.2
  hitbox.userData.characterId = id
  group.add(hitbox)

  return { group, armL, armR, head, ring, baseY: FLOOR_Y, phase }
}

function addDoor(
  root: THREE.Group,
  side: -1 | 1,
  z: number,
  title: string,
  subtitle: string,
  accent: number,
) {
  const panelMat = new THREE.MeshStandardMaterial({ color: 0x163b4b, roughness: 0.78 })
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x2c6876, roughness: 0.7, metalness: 0.08 })
  const glowMat = new THREE.MeshBasicMaterial({ color: accent })

  const x = side * 2.9
  root.add(box(0.07, 2.12, 1.02, panelMat, x, 1.06, z))
  root.add(box(0.12, 0.12, 1.24, frameMat, x, 2.17, z))
  root.add(box(0.12, 2.2, 0.11, frameMat, x, 1.1, z - 0.62))
  root.add(box(0.12, 2.2, 0.11, frameMat, x, 1.1, z + 0.62))
  root.add(box(0.06, 0.04, 0.92, glowMat, side * 2.83, 0.03, z))

  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 8), glowMat)
  knob.position.set(side * 2.8, 1.02, z + 0.35)
  root.add(knob)

  const signTexture = makeSignTexture(title, subtitle, `#${accent.toString(16).padStart(6, '0')}`)
  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(1.08, 0.54),
    new THREE.MeshBasicMaterial({ map: signTexture, transparent: true }),
  )
  sign.position.set(side * 2.75, 2.5, z)
  sign.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2
  root.add(sign)

  const light = new THREE.PointLight(accent, 8, 6, 2)
  light.position.set(side * 2.1, 1.9, z)
  root.add(light)
}

export function createHostelScene(
  canvas: HTMLCanvasElement,
  options: HostelSceneOptions = {},
): HostelSceneHandle {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance',
  })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.2

  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x071923)
  scene.fog = new THREE.Fog(0x071923, 18, 64)

  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 120)
  camera.position.set(0, 1.62, 18.5)

  scene.add(new THREE.HemisphereLight(0x9fe8da, 0x071923, 1.1))
  scene.add(new THREE.AmbientLight(0x2c5a66, 0.9))
  scene.add(new THREE.DirectionalLight(0x70dbc6, 0.55))

  // A soft headlamp keeps the two characters readable while the corridor
  // itself stays late-night dark. Without it the physically-correct point
  // lights leave the faces almost black on low-brightness screens.
  scene.add(camera)
  const cameraFill = new THREE.PointLight(0xd7e3e8, 7, 15, 2)
  cameraFill.position.set(0, 0.3, 0.6)
  camera.add(cameraFill)

  const root = new THREE.Group()
  scene.add(root)

  const floorMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: makeFloorTexture(),
    roughness: 0.86,
    metalness: 0.02,
  })
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(6.2, CORRIDOR_LENGTH), floorMat)
  floor.rotation.x = -Math.PI / 2
  floor.position.set(0, FLOOR_Y, CORRIDOR_Z)
  root.add(floor)

  const ceilingMat = new THREE.MeshStandardMaterial({ color: 0x081b25, roughness: 0.95 })
  root.add(box(6.4, 0.2, CORRIDOR_LENGTH, ceilingMat, 0, 3.2, CORRIDOR_Z))

  const wallMat = new THREE.MeshStandardMaterial({ color: 0x164050, roughness: 0.86 })
  const wainscotMat = new THREE.MeshStandardMaterial({ color: 0x0d2a36, roughness: 0.9 })
  const trimMat = new THREE.MeshStandardMaterial({ color: 0x2a6472, roughness: 0.7, metalness: 0.1 })

  for (const side of [-1, 1] as const) {
    root.add(box(0.24, 3.2, CORRIDOR_LENGTH, wallMat, side * 3.06, 1.6, CORRIDOR_Z))
    root.add(box(0.08, 0.82, CORRIDOR_LENGTH, wainscotMat, side * 2.93, 0.41, CORRIDOR_Z))
    root.add(box(0.1, 0.09, CORRIDOR_LENGTH, trimMat, side * 2.92, 2.7, CORRIDOR_Z))
    root.add(box(0.1, 0.09, CORRIDOR_LENGTH, trimMat, side * 2.92, 0.86, CORRIDOR_Z))
  }

  const endWall = box(6.4, 3.2, 0.2, wallMat, 0, 1.6, -46.2)
  root.add(endWall)
  root.add(box(6.4, 0.06, 0.3, trimMat, 0, 2.9, -46))

  addDoor(root, -1, 4.2, '302', 'BOYS', 0x70dbc6)
  addDoor(root, 1, -10.6, '305', 'GIRLS', 0xf2b544)

  const posterA = makePosterTexture('MESS MATES', 'Bazar · Meals · Settle', '#70dbc6')
  const posterMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(1.15, 0.72),
    new THREE.MeshBasicMaterial({ map: posterA }),
  )
  posterMesh.position.set(2.88, 1.85, -2.6)
  posterMesh.rotation.y = -Math.PI / 2
  root.add(posterMesh)

  const posterB = makePosterTexture('GUILD NIGHT', 'Chess · Dice · Polls', '#f2b544')
  const posterMeshB = new THREE.Mesh(
    new THREE.PlaneGeometry(1.05, 0.66),
    new THREE.MeshBasicMaterial({ map: posterB }),
  )
  posterMeshB.position.set(-2.88, 1.8, -18)
  posterMeshB.rotation.y = Math.PI / 2
  root.add(posterMeshB)

  const posterC = makePosterTexture('PAY YOUR DUES', 'The ledger remembers', '#fb5d12')
  const posterMeshC = new THREE.Mesh(
    new THREE.PlaneGeometry(1.05, 0.66),
    new THREE.MeshBasicMaterial({ map: posterC }),
  )
  posterMeshC.position.set(2.88, 1.75, -28)
  posterMeshC.rotation.y = -Math.PI / 2
  root.add(posterMeshC)

  const bulbMat = new THREE.MeshBasicMaterial({ color: 0xd1f7ec })
  const warmMat = new THREE.MeshBasicMaterial({ color: 0xf2b544 })
  const stringMats = [bulbMat, warmMat, new THREE.MeshBasicMaterial({ color: 0x70dbc6 })]
  const hallLights: THREE.PointLight[] = []

  let fixture = 0
  for (let z = 14; z > -44; z -= 6) {
    root.add(box(0.72, 0.055, 0.2, bulbMat, 0, 3.08, z))
    if (fixture % 2 === 0) {
      const light = new THREE.PointLight(0xc8f4ea, 3.2, 10, 2)
      light.position.set(0, 2.92, z)
      root.add(light)
      hallLights.push(light)
    }
    fixture += 1
  }

  for (const side of [-1, 1] as const) {
    for (let i = 0; i < 12; i += 1) {
      const bulb = new THREE.Mesh(
        new THREE.SphereGeometry(0.045, 8, 6),
        stringMats[i % stringMats.length],
      )
      bulb.position.set(side * 2.7, 2.98, 12 - i * 4.6)
      root.add(bulb)
    }
  }

  const crateMat = new THREE.MeshStandardMaterial({ color: 0x8a5b32, roughness: 0.9 })
  root.add(box(0.7, 0.55, 0.55, crateMat, -2.35, 0.28, -2.2))
  root.add(box(0.54, 0.42, 0.48, crateMat, -2.3, 0.76, -2.35))
  root.add(box(0.58, 0.62, 0.4, crateMat, 2.35, 0.31, -20.5))

  const jarMat = new THREE.MeshStandardMaterial({ color: 0x2c7a78, roughness: 0.5 })
  const jar = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.2, 0.52, 12), jarMat)
  jar.position.set(2.4, 0.26, -5.4)
  root.add(jar)

  const portal = new THREE.Group()
  portal.position.set(0, 1.75, -45.85)
  const portalRing = new THREE.Mesh(
    new THREE.TorusGeometry(1.85, 0.11, 12, 56),
    new THREE.MeshBasicMaterial({ color: 0xf2b544 }),
  )
  const portalRingInner = new THREE.Mesh(
    new THREE.TorusGeometry(1.55, 0.045, 10, 48),
    new THREE.MeshBasicMaterial({ color: 0xf6f0e2 }),
  )
  const portalDisc = new THREE.Mesh(
    new THREE.CircleGeometry(1.5, 48),
    new THREE.MeshBasicMaterial({
      color: 0xf2b544,
      transparent: true,
      opacity: 0.28,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  )
  portal.add(portalRing, portalRingInner, portalDisc)
  root.add(portal)

  const portalSignTexture = makeSignTexture('07', 'LEDGER ROOM', '#f2b544')
  const portalSign = new THREE.Mesh(
    new THREE.PlaneGeometry(1.7, 0.85),
    new THREE.MeshBasicMaterial({ map: portalSignTexture, transparent: true }),
  )
  portalSign.position.set(0, 3.02, -45.7)
  root.add(portalSign)

  const portalLight = new THREE.PointLight(0xf2b544, 24, 18, 2)
  portalLight.position.set(0, 1.8, -43.8)
  root.add(portalLight)

  const dustGeometry = new THREE.BufferGeometry()
  const dustPositions = new Float32Array(170 * 3)
  for (let i = 0; i < 170; i += 1) {
    dustPositions[i * 3] = (Math.random() - 0.5) * 5.4
    dustPositions[i * 3 + 1] = 0.2 + Math.random() * 2.8
    dustPositions[i * 3 + 2] = 16 - Math.random() * 60
  }
  dustGeometry.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3))
  const dust = new THREE.Points(
    dustGeometry,
    new THREE.PointsMaterial({
      color: 0xa6ecdb,
      size: 0.028,
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
    }),
  )
  root.add(dust)

  const rafi = makeCharacter(
    'rafi',
    { skin: 0xb97a56, hoodie: 0x1c6b70, accent: 0xf2b544, pants: 0x203a4a, hair: 0x151515 },
    -2.02,
    4.25,
    0,
  )
  const mim = makeCharacter(
    'mim',
    { skin: 0xc98a63, hoodie: 0xd4633b, accent: 0x70dbc6, pants: 0x1d3546, hair: 0x171717 },
    2.02,
    -11.1,
    1.8,
  )
  root.add(rafi.group, mim.group)
  const rigs = [rafi, mim]

  const hitboxes = [rafi.group.children[rafi.group.children.length - 1], mim.group.children[mim.group.children.length - 1]]

  const keys: CameraKey[] = [
    { p: 0, pos: new THREE.Vector3(0, 1.62, 18.5), look: new THREE.Vector3(0, 1.48, 8) },
    { p: 0.12, pos: new THREE.Vector3(-0.1, 1.6, 12), look: new THREE.Vector3(-1.5, 1.45, 4.5) },
    { p: 0.24, pos: new THREE.Vector3(-0.05, 1.55, 7.4), look: new THREE.Vector3(-2.05, 1.45, 4.25) },
    { p: 0.36, pos: new THREE.Vector3(0.05, 1.55, 6.2), look: new THREE.Vector3(-2.05, 1.45, 4.25) },
    { p: 0.44, pos: new THREE.Vector3(0.12, 1.58, 0.5), look: new THREE.Vector3(0, 1.45, -8) },
    { p: 0.56, pos: new THREE.Vector3(-0.05, 1.54, -8.2), look: new THREE.Vector3(2.05, 1.45, -11.1) },
    { p: 0.68, pos: new THREE.Vector3(0.05, 1.58, -11.6), look: new THREE.Vector3(0, 1.45, -20) },
    { p: 0.8, pos: new THREE.Vector3(0, 1.55, -22), look: new THREE.Vector3(0, 1.5, -32) },
    { p: 0.92, pos: new THREE.Vector3(0, 1.55, -33), look: new THREE.Vector3(0, 1.65, -43) },
    { p: 1, pos: new THREE.Vector3(0, 1.6, -38.6), look: new THREE.Vector3(0, 1.7, -44) },
  ]

  const cameraPos = new THREE.Vector3()
  const cameraLook = new THREE.Vector3()
  const pointer = new THREE.Vector2()
  const raycaster = new THREE.Raycaster()
  const ndc = new THREE.Vector2()

  let targetProgress = 0
  let displayProgress = 0
  let selected: CharacterId | null = null
  let active = true
  let raf = 0
  let lastFrame = 0
  let disposed = false
  let hoverPointer = 0

  const resize = () => {
    const width = canvas.clientWidth
    const height = canvas.clientHeight
    if (!width || !height) return
    renderer.setSize(width, height, false)
    camera.aspect = width / height
    camera.updateProjectionMatrix()
  }

  const sampleCamera = (progress: number) => {
    let index = 0
    while (index < keys.length - 2 && progress > keys[index + 1].p) index += 1
    const a = keys[index]
    const b = keys[index + 1]
    const raw = clamp((progress - a.p) / Math.max(0.0001, b.p - a.p))
    const t = smoothstep(raw)
    cameraPos.lerpVectors(a.pos, b.pos, t)
    cameraLook.lerpVectors(a.look, b.look, t)
  }

  const updateSelection = (delta: number) => {
    for (const rig of rigs) {
      const isSelected = rig.group.userData.characterId === selected
      const target = isSelected ? 0.92 : 0
      rig.ring.material.opacity += (target - rig.ring.material.opacity) * Math.min(1, delta * 10)
      const targetScale = isSelected ? 1.03 : 1
      const next = rig.group.scale.x + (targetScale - rig.group.scale.x) * Math.min(1, delta * 10)
      rig.group.scale.setScalar(next)
    }
  }

  const tick = (now: number) => {
    if (disposed) return
    if (!lastFrame) lastFrame = now
    const delta = Math.min(0.05, (now - lastFrame) / 1000)
    lastFrame = now
    const time = now / 1000

    displayProgress += (targetProgress - displayProgress) * Math.min(1, delta * 7.5)
    sampleCamera(displayProgress)

    camera.position.set(
      cameraPos.x + pointer.x * 0.16,
      cameraPos.y - pointer.y * 0.07 + Math.sin(time * 0.9) * 0.008,
      cameraPos.z,
    )
    cameraLook.x += pointer.x * 0.2
    cameraLook.y += -pointer.y * 0.09
    camera.lookAt(cameraLook)

    for (const rig of rigs) {
      rig.group.position.y = rig.baseY + Math.sin(time * 1.5 + rig.phase) * 0.018
      rig.group.rotation.z = Math.sin(time * 0.75 + rig.phase) * 0.008
      rig.armL.rotation.x = Math.sin(time * 1.3 + rig.phase) * 0.045
      rig.armR.rotation.x = -Math.sin(time * 1.3 + rig.phase) * 0.045
      rig.head.rotation.y = Math.sin(time * 0.55 + rig.phase) * 0.09
    }

    updateSelection(delta)

    portalRing.rotation.z = time * 0.28
    portalRingInner.rotation.z = -time * 0.45
    portalDisc.material.opacity = 0.23 + Math.sin(time * 2.1) * 0.04
    const portalPush = Math.max(0, (displayProgress - 0.82) / 0.18)
    portal.scale.setScalar(1 + portalPush * 0.08 + Math.sin(time * 2.2) * 0.008)
    portalLight.intensity = 24 + portalPush * 8 + Math.sin(time * 2.4) * 1.2

    for (let i = 0; i < hallLights.length; i += 1) {
      hallLights[i].intensity = 3.15 + Math.sin(time * 9 + i * 1.7) * 0.12
    }

    dust.rotation.y = Math.sin(time * 0.04) * 0.02

    renderer.render(scene, camera)
    raf = requestAnimationFrame(tick)
  }

  const start = () => {
    if (disposed || raf || !active || document.hidden) return
    lastFrame = 0
    raf = requestAnimationFrame(tick)
  }

  const stop = () => {
    if (raf) cancelAnimationFrame(raf)
    raf = 0
  }

  const setProgress = (value: number) => {
    targetProgress = clamp(value)
  }

  const setSelected = (id: CharacterId | null) => {
    selected = id
  }

  const setActive = (next: boolean) => {
    active = next
    if (next) start()
    else stop()
  }

  const pointerNdc = (clientX: number, clientY: number) => {
    const rect = canvas.getBoundingClientRect()
    if (!rect.width || !rect.height) return null
    ndc.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1)
    return ndc
  }

  const pick = (clientX: number, clientY: number): CharacterId | null => {
    const point = pointerNdc(clientX, clientY)
    if (!point) return null
    raycaster.setFromCamera(point, camera)
    const hit = raycaster.intersectObjects(hitboxes, false)[0]
    if (!hit) return null
    const id = hit.object.userData.characterId
    return id === 'rafi' || id === 'mim' ? id : null
  }

  const onPointerMove = (event: PointerEvent) => {
    if (event.pointerType !== 'mouse') return
    const rect = canvas.getBoundingClientRect()
    if (!rect.width || !rect.height) return
    pointer.set(
      clamp(((event.clientX - rect.left) / rect.width) * 2 - 1, -1, 1),
      clamp(-((event.clientY - rect.top) / rect.height) * 2 + 1, -1, 1),
    )

    const now = performance.now()
    if (now - hoverPointer < 90) return
    hoverPointer = now
    canvas.style.cursor = pick(event.clientX, event.clientY) ? 'pointer' : 'default'
  }

  const onPointerLeave = () => {
    pointer.set(0, 0)
    canvas.style.cursor = 'default'
  }

  const onClick = (event: MouseEvent) => {
    options.onSelect?.(pick(event.clientX, event.clientY))
  }

  const onVisibility = () => {
    if (document.hidden) stop()
    else start()
  }

  canvas.addEventListener('pointermove', onPointerMove)
  canvas.addEventListener('pointerleave', onPointerLeave)
  canvas.addEventListener('click', onClick)
  document.addEventListener('visibilitychange', onVisibility)

  const resizeObserver = new ResizeObserver(resize)
  resizeObserver.observe(canvas)
  resize()

  start()

  return {
    setProgress,
    setSelected,
    setActive,
    resize,
    dispose: () => {
      disposed = true
      stop()
      canvas.removeEventListener('pointermove', onPointerMove)
      canvas.removeEventListener('pointerleave', onPointerLeave)
      canvas.removeEventListener('click', onClick)
      document.removeEventListener('visibilitychange', onVisibility)
      resizeObserver.disconnect()

      const textures = new Set<THREE.Texture>()
      scene.traverse((object) => {
        const mesh = object as THREE.Mesh
        if (mesh.geometry) mesh.geometry.dispose()
        const material = (object as THREE.Mesh).material
        const materials = Array.isArray(material) ? material : material ? [material] : []
        for (const item of materials) {
          const mapped = (item as THREE.MeshStandardMaterial).map
          if (mapped) textures.add(mapped)
          item.dispose()
        }
      })
      for (const texture of textures) texture.dispose()
      renderer.dispose()
    },
  }
}
