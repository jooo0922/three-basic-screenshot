'use strict';

import * as THREE from 'https://cdn.skypack.dev/three@0.128.0';

function main() {
  const canvas = document.querySelector('#canvas');
  const renderer = new THREE.WebGLRenderer({
    canvas
  });

  const fov = 75;
  const aspect = 2 // 캔버스의 가로 / 세로 비율. 캔버스의 기본 크기가 300 * 150이므로 캔버스 기본 비율과 동일하게 설정한 셈.
  const near = 0.1;
  const far = 5;
  const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);

  camera.position.z = 2;

  const scene = new THREE.Scene();

  {
    const color = 0xFFFFFF;
    const intensity = 1;
    const light = new THREE.DirectionalLight(color, intensity);
    light.position.set(-1, 2, 4);
    scene.add(light);
  }

  const boxWidth = 1;
  const boxHeight = 1;
  const boxDepth = 1;
  const geometry = new THREE.BoxGeometry(boxWidth, boxHeight, boxDepth);

  function makeInstance(geometry, color, x) {
    const material = new THREE.MeshPhongMaterial({
      color
    });

    const cube = new THREE.Mesh(geometry, material);
    scene.add(cube);

    cube.position.x = x;

    return cube;
  }

  const cubes = [
    makeInstance(geometry, 0x44aa88, 0),
    makeInstance(geometry, 0x8844aa, -2),
    makeInstance(geometry, 0xaa8844, 2),
  ];

  /**
   * three.js에서 레티나 디스플레이를 다루는 방법
   * (공식 문서에는 HD-DPI를 다루는 법이라고 나와있음.)
   * 
   * renderer.setPixelRatio(window.devicePixelRatio);
   * 
   * 위에 메소드를 사용해서 캔버스의 픽셀 사이즈를 CSS 사이즈에 맟출수도 있지만, 
   * 공식 문서에서는 추천하지 않는다고 함.
   * 
   * 그냥 아래와 같이 pixelRatio값을 직접 구한 뒤에 clientWidth,Height에 곱해주는 게 훨씬 낫다고 함.
   * 원래 2d canvas에 할때도 이렇게 했으니 하던대로 하면 될 듯.
   * 
   * 자세한 내용은 공식 문서 참고...
   */
  function resizeRendererToDisplaySize(renderer) {
    const canvas = renderer.domElement;
    const pixelRatio = window.devicePixelRatio;
    const width = canvas.clientWidth * pixelRatio | 0;
    const height = canvas.clientHeight * pixelRatio | 0;

    const needResize = canvas.width !== width || canvas.height !== height;

    if (needResize) {
      renderer.setSize(width, height, false);
    }

    return needResize;
  }

  // animate와 render 함수를 쪼개서 작성해준 이유
  // 기본적으로 브라우저는 화면을 렌더링한 후 WebGL 캔버스의 드로잉 버퍼를 지워버리기 때문에
  // 지우고 나서 blob객체를 다운로드 받으면 빈 화면만 다운로드되는 걸 확인할 수 있음.
  // 이걸 해결하려면, 화면을 캡쳐하기 직전에 화면을 렌더링하는 함수를 호출해야 함.
  // 근데 그렇다고 캡쳐할 때마다 animate 함수를 중복 호출할 수는 없으니까
  // animate기능을 하는 함수와, renderer에 씬과 카메라를 전달해서 WebGL 캔버스에 렌더하는 함수를 나눠서
  // 후자의 함수만 캡쳐를 뜨기 전 호출할 수 있도록 분리해준거임.
  const state = {
    t: 0,
  };

  function render() {
    if (resizeRendererToDisplaySize(renderer)) {
      const canvas = renderer.domElement;
      camera.aspect = canvas.clientWidth / canvas.clientHeight;
      camera.updateProjectionMatrix();
    }

    cubes.forEach((cube, index) => {
      const speed = 1 + index * 0.1;
      // 이렇게 바꾼 이유는 render 함수와 animate 함수가 분리된 상태에서 animate 함수에서 전달받는
      // 타임스탬프(t)값을 캡쳐 직전에 render만 호출하면 받을 수 없기 때문.
      // 이걸 해결하기 위해 animate 함수에서 매 프레임마다 달라지는 t값을 state.t라는 곳에 따로 저장해두고,
      // render 함수에서 필요할 때 꺼내쓸 수 있도록 함. 
      const rotate = state.t * speed;
      cube.rotation.x = rotate;
      cube.rotation.y = rotate;
    });

    renderer.render(scene, camera);
  }

  function animate(t) {
    // 타임스탬프 값이 16.~~ms 이런식으로 밀리세컨드 단위로 리턴받는거를 0.016~~s의 세컨드 단위로 변환하려는 거.
    // 이제 매 프레임마다 갱신되는 세컨드 단위의 타임스탬프 값만큼 해당 mesh의 x축과 y축을 회전시키겠다는 거임.
    state.t = t *= 0.001;

    render();

    requestAnimationFrame(animate);
  }

  requestAnimationFrame(animate);

  /**
   * save button을 클릭하면 blob을 생성하도록 함.
   * 
   * canvas.toBlob은
   * WebGLRenderer에 담긴 캔버스에 그려진 이미지를 
   * Blob Object(이미지, 사운드, 동영상 등 대용량 바이너리 데이터를 담을 수 있는 객체)로 만들어 줌.
   * 
   * 이 때, canvas.toBlob()은 새롭게 생성한 blob 오브젝트를 단일 인자로 받는 콜백함수를
   * 파라미터로 전달받을 수 있음.
   */
  const elem = document.querySelector('#screenshot');
  elem.addEventListener('click', () => {
    render(); // render함수를 따로 분리해서 오직 화면 렌더링만 하도록 바꿨으니 화면을 캡쳐하기 직전에 render 함수만 호출해 줌.
    canvas.toBlob((blob) => {
      saveBlob(blob, `screencapture-${canvas.width}x${canvas.height}.png`);
    });
  });

  // saveBlob에는 아래의 함수에서 리턴해주는 클로저 함수(saveData())가 할당되기 때문에,
  // 위에 toBlob의 콜백함수에서 saveBlob을 호출할 때 클로저 함수에서 정의한 파라미터 값을 기준으로 인자를 넘겨줬던거임.
  const saveBlob = (function () {
    const a = document.createElement('a'); // a 태그를 새롭게 생성함.
    document.body.appendChild(a); // a 태그를 body에 추가해 줌.
    a.style.display = 'none'; // a태그를 body에 추가했지만 화면에서는 안보이도록 하는거임.
    return function saveData(blob, fileName) {
      // createObjectURL(object)는 File, Blob, MediaSource 등의 객체를 전달받아서 해당 객체의 참조 URL을 담은 DOMString으로 리턴해 줌.
      const url = window.URL.createObjectURL(blob); // toBlob의 콜백함수로부터 전달받은 blob객체를 전달해 줌.
      a.href = url // 위의 blob객체의 참조 URL이 담긴 DOMString을 a태그의 href에 할당함.
      a.download = fileName // a태그의 download 속성을 할당하여 링크를 클릭하면 a태그의 href에 지정된 파일이 다운로드될 수 있도록 함.
      // 참고로 download 속성에 fileName을 입력하면 다운로드받는 파일의 이름도 지정해줄 수 있음.
      a.click(); // DOMElemnt의 click 이벤트를 시뮬레이션해줌. -> href에 지정된 blob객체 파일이 다운로드되겠지
    };
  }());
  // 참고로 내 추측인데 saveBlob에 할당하는 함수를 ()소괄호로 감싼 이유는,
  // 바깥쪽 함수를 바로 saveBlob에 할당하는 게 아니라, saveBlob을 호출하면
  // 바깥쪽 함수를 먼저 실행한 뒤, saveData 클로저 함수를 saveBlob에 할당하고, 
  // 그러고 나서 할당된 클로저 함수를 바로 호출하라...는 뜻 아닐까? 그래서 맨 끝에 ()소괄호가 하나 더 붙은 것도
  // 클로저 함수를 호출하라는 의미로 쓰는 거 같은데.. 이렇게 생긴 문법을 처음봐서 하나도 모르겠다ㅜ
}

main();