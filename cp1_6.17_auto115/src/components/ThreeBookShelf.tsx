import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Book, CATEGORY_COLORS, CategoryType } from '../types';

interface ThreeBookShelfProps {
  books: Book[];
  onAddToCart: (book: Book) => void;
  isMobile: boolean;
}

const ThreeBookShelf: React.FC<ThreeBookShelfProps> = ({ books, onAddToCart, isMobile }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [showModal, setShowModal] = useState(false);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const bookMeshesRef = useRef<{ mesh: THREE.Mesh; book: Book }[]>([]);
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster());
  const mouseRef = useRef<THREE.Vector2>(new THREE.Vector2());
  const animationFrameRef = useRef<number>(0);

  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf5f0e8);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      60,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 1, 8);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 4;
    controls.maxDistance = 15;
    controls.maxPolarAngle = Math.PI / 2 + 0.3;
    controls.target.set(0, 1, 0);
    controlsRef.current = controls;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 8, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);

    const pointLight = new THREE.PointLight(0xffeedd, 0.5);
    pointLight.position.set(-3, 3, 3);
    scene.add(pointLight);

    createBookshelf(scene);
    createBooks(scene, books);

    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!containerRef.current) return;
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    window.addEventListener('resize', handleResize);

    const handleClick = (event: MouseEvent) => {
      if (!containerRef.current || !cameraRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);
      const meshes = bookMeshesRef.current.map((item) => item.mesh);
      const intersects = raycasterRef.current.intersectObjects(meshes, true);

      if (intersects.length > 0) {
        let targetMesh = intersects[0].object as THREE.Mesh;
        while (targetMesh.parent && !bookMeshesRef.current.find((b) => b.mesh === targetMesh)) {
          targetMesh = targetMesh.parent as THREE.Mesh;
        }
        const bookData = bookMeshesRef.current.find((b) => b.mesh === targetMesh);
        if (bookData) {
          setSelectedBook(bookData.book);
          setShowModal(true);
        }
      }
    };
    renderer.domElement.addEventListener('click', handleClick);

    return () => {
      cancelAnimationFrame(animationFrameRef.current);
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('click', handleClick);
      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  useEffect(() => {
    if (!sceneRef.current) return;
    bookMeshesRef.current.forEach(({ mesh }) => {
      sceneRef.current?.remove(mesh);
    });
    bookMeshesRef.current = [];
    createBooks(sceneRef.current, books);
  }, [books]);

  const createBookshelf = (scene: THREE.Scene) => {
    const shelfWoodColor = 0x8b6914;
    const shelfDarkColor = 0x654321;

    const backBoardGeo = new THREE.BoxGeometry(10, 5, 0.2);
    const backBoardMat = new THREE.MeshStandardMaterial({ color: shelfDarkColor });
    const backBoard = new THREE.Mesh(backBoardGeo, backBoardMat);
    backBoard.position.set(0, 1.5, -0.5);
    backBoard.receiveShadow = true;
    scene.add(backBoard);

    const shelfThickness = 0.15;
    const shelfDepth = 1;
    const shelfWidth = 10;
    const shelfYPositions = [-0.5, 0.8, 2.1, 3.4];

    shelfYPositions.forEach((y) => {
      const shelfGeo = new THREE.BoxGeometry(shelfWidth, shelfThickness, shelfDepth);
      const shelfMat = new THREE.MeshStandardMaterial({ color: shelfWoodColor });
      const shelf = new THREE.Mesh(shelfGeo, shelfMat);
      shelf.position.set(0, y, 0);
      shelf.receiveShadow = true;
      shelf.castShadow = true;
      scene.add(shelf);
    });

    const sideGeo = new THREE.BoxGeometry(0.15, 4.5, shelfDepth);
    const sideMat = new THREE.MeshStandardMaterial({ color: shelfDarkColor });

    const leftSide = new THREE.Mesh(sideGeo, sideMat);
    leftSide.position.set(-shelfWidth / 2, 1.45, 0);
    leftSide.castShadow = true;
    scene.add(leftSide);

    const rightSide = new THREE.Mesh(sideGeo, sideMat);
    rightSide.position.set(shelfWidth / 2, 1.45, 0);
    rightSide.castShadow = true;
    scene.add(rightSide);

    const verticalDividers = [-2.5, 2.5];
    verticalDividers.forEach((x) => {
      const divider = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 4.2, shelfDepth - 0.1),
        new THREE.MeshStandardMaterial({ color: shelfWoodColor })
      );
      divider.position.set(x, 1.45, 0);
      scene.add(divider);
    });

    const floorGeo = new THREE.BoxGeometry(14, 0.2, 6);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0xd4a574 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.position.set(0, -0.9, 1);
    floor.receiveShadow = true;
    scene.add(floor);
  };

  const createBooks = (scene: THREE.Scene, bookList: Book[]) => {
    const shelfYPositions = [-0.35, 0.95, 2.25, 3.55];
    const shelfSections = [
      { minX: -4.5, maxX: -2.6 },
      { minX: -2.4, maxX: 2.4 },
      { minX: 2.6, maxX: 4.5 },
    ];
    const categories: CategoryType[] = ['小说', '科技', '艺术'];
    const categoryBooks: Record<string, Book[]> = {
      '小说': [],
      '科技': [],
      '艺术': [],
    };

    bookList.forEach((book) => {
      const cat = book.category as CategoryType;
      if (categoryBooks[cat]) {
        categoryBooks[cat].push(book);
      } else {
        categoryBooks['小说'].push(book);
      }
    });

    categories.forEach((category, catIndex) => {
      const section = shelfSections[catIndex];
      const booksInCat = categoryBooks[category];
      const booksPerShelf = Math.ceil(booksInCat.length / 4);

      for (let shelfIdx = 0; shelfIdx < 4 && shelfIdx * booksPerShelf < booksInCat.length; shelfIdx++) {
        const shelfBooks = booksInCat.slice(shelfIdx * booksPerShelf, (shelfIdx + 1) * booksPerShelf);
        const totalWidth = section.maxX - section.minX;
        const bookWidth = Math.min(0.35, totalWidth / (shelfBooks.length + 1));
        const startX = section.minX + bookWidth / 2 + (totalWidth - bookWidth * shelfBooks.length) / 2;

        shelfBooks.forEach((book, bookIdx) => {
          const bookGroup = createBookMesh(book, category as CategoryType);
          bookGroup.position.x = startX + bookIdx * bookWidth;
          bookGroup.position.y = shelfYPositions[shelfIdx];
          bookGroup.position.z = 0.05;
          (bookGroup.userData as { book: Book }).book = book;
          scene.add(bookGroup);
          bookMeshesRef.current.push({ mesh: bookGroup as unknown as THREE.Mesh, book });
        });
      }
    });
  };

  const createBookMesh = (book: Book, category: CategoryType): THREE.Group => {
    const group = new THREE.Group();

    const colors = CATEGORY_COLORS[category] || CATEGORY_COLORS['小说'];
    const colorIndex = Math.abs(hashCode(book.id)) % colors.length;
    const coverColor = new THREE.Color(colors[colorIndex]);

    const bookHeight = 0.7 + Math.random() * 0.2;
    const bookWidth = 0.25 + Math.random() * 0.1;
    const bookDepth = 0.6 + Math.random() * 0.15;

    const coverGeo = new THREE.BoxGeometry(bookWidth, bookHeight, bookDepth);
    const coverMat = new THREE.MeshStandardMaterial({
      color: coverColor,
      roughness: 0.7,
      metalness: 0.1,
    });
    const cover = new THREE.Mesh(coverGeo, coverMat);
    cover.castShadow = true;
    group.add(cover);

    const spineGeo = new THREE.BoxGeometry(bookWidth * 1.02, bookHeight * 0.95, 0.02);
    const spineMat = new THREE.MeshStandardMaterial({
      color: coverColor.clone().multiplyScalar(0.7),
      roughness: 0.6,
    });
    const spine = new THREE.Mesh(spineGeo, spineMat);
    spine.position.z = bookDepth / 2 + 0.01;
    group.add(spine);

    const pagesGeo = new THREE.BoxGeometry(bookWidth * 0.95, bookHeight * 0.92, bookDepth * 0.95);
    const pagesMat = new THREE.MeshStandardMaterial({
      color: 0xfaf8f0,
      roughness: 0.9,
    });
    const pages = new THREE.Mesh(pagesGeo, pagesMat);
    pages.position.x = -bookWidth * 0.02;
    group.add(pages);

    return group;
  };

  const hashCode = (str: string): number => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash;
  };

  const handleAddToCart = () => {
    if (selectedBook) {
      onAddToCart(selectedBook);
      setShowModal(false);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setTimeout(() => setSelectedBook(null), 300);
  };

  const getCategoryColor = (category: string): string => {
    const colors = CATEGORY_COLORS[category as CategoryType] || CATEGORY_COLORS['小说'];
    return colors[0];
  };

  const renderMobileView = () => (
    <div style={{
      padding: '20px',
      maxWidth: '1200px',
      margin: '0 auto',
    }}>
      <h2 style={{
        textAlign: 'center',
        color: '#5d4037',
        marginBottom: '24px',
        fontSize: '24px',
      }}>
        📚 虚拟书店
      </h2>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
        gap: '16px',
      }}>
        {books.map((book) => (
          <div
            key={book.id}
            onClick={() => {
              setSelectedBook(book);
              setShowModal(true);
            }}
            style={{
              backgroundColor: '#faf6f0',
              borderRadius: '12px',
              padding: '12px',
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(93, 64, 55, 0.08)',
              transition: 'transform 0.2s',
            }}
          >
            <div
              style={{
                width: '100%',
                height: '120px',
                borderRadius: '8px',
                backgroundColor: getCategoryColor(book.category),
                marginBottom: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '12px',
                fontWeight: 'bold',
                textAlign: 'center',
                padding: '8px',
              }}
            >
              {book.title}
            </div>
            <h4 style={{
              fontSize: '14px',
              color: '#5d4037',
              marginBottom: '4px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}>
              {book.title}
            </h4>
            <p style={{
              fontSize: '12px',
              color: '#8d6e63',
              marginBottom: '6px',
            }}>
              {book.author}
            </p>
            <p style={{
              fontSize: '14px',
              fontWeight: 600,
              color: '#c44536',
            }}>
              ¥{book.price.toFixed(2)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );

  const renderModal = () => {
    if (!selectedBook && !showModal) return null;

    return (
      <div
        onClick={closeModal}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.4)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          opacity: showModal ? 1 : 0,
          transition: 'opacity 0.3s ease',
        }}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            backgroundColor: 'rgba(255, 252, 245, 0.95)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            borderRadius: '16px',
            padding: '24px',
            maxWidth: '400px',
            width: '90%',
            boxShadow: '0 8px 32px rgba(93, 64, 55, 0.2)',
            transform: showModal ? 'scale(1)' : 'scale(0.9)',
            opacity: showModal ? 1 : 0,
            transition: 'transform 0.3s ease, opacity 0.3s ease',
          }}
        >
          {selectedBook && (
            <>
              <div
                style={{
                  width: '100%',
                  height: '200px',
                  borderRadius: '12px',
                  backgroundColor: getCategoryColor(selectedBook.category),
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '20px',
                  fontWeight: 'bold',
                  textAlign: 'center',
                  padding: '20px',
                }}
              >
                {selectedBook.title}
              </div>
              <span
                style={{
                  display: 'inline-block',
                  padding: '4px 12px',
                  backgroundColor: getCategoryColor(selectedBook.category) + '30',
                  color: getCategoryColor(selectedBook.category),
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: 500,
                  marginBottom: '12px',
                }}
              >
                {selectedBook.category}
              </span>
              <h3 style={{
                fontSize: '22px',
                color: '#5d4037',
                marginBottom: '6px',
              }}>
                {selectedBook.title}
              </h3>
              <p style={{
                fontSize: '14px',
                color: '#8d6e63',
                marginBottom: '12px',
              }}>
                {selectedBook.author}
              </p>
              <p style={{
                fontSize: '14px',
                color: '#6d4c41',
                lineHeight: 1.6,
                marginBottom: '16px',
              }}>
                {selectedBook.description}
              </p>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px',
              }}>
                <span style={{
                  fontSize: '24px',
                  fontWeight: 700,
                  color: '#c44536',
                }}>
                  ¥{selectedBook.price.toFixed(2)}
                </span>
                <span style={{
                  fontSize: '13px',
                  color: '#8d6e63',
                }}>
                  库存: {selectedBook.stock}
                </span>
              </div>
              <button
                onClick={handleAddToCart}
                style={{
                  width: '100%',
                  padding: '14px',
                  backgroundColor: '#2d5a3d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '16px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#1e3f2a')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#2d5a3d')}
              >
                🛒 加入购物车
              </button>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div style={{ width: '100%', height: '100%' }}>
      {isMobile ? (
        renderMobileView()
      ) : (
        <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
      )}
      {renderModal()}
    </div>
  );
};

export default ThreeBookShelf;
